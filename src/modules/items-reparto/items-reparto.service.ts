import { operacionAbierta } from '../operaciones-carga/estados-operacion';
import { actorActual, exigirSupervisor } from '../../common/security/request-context';
import { cargaEditable } from '../operaciones-carga/flujo-operacion';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateItemRepartoDto } from './dto/create-items-reparto.dto';
import { UpdateItemRepartoDto } from './dto/update-items-reparto.dto';
import { QueryItemsRepartoDto } from './dto/query-items-reparto.dto';
import { UpdateItemsRepartoDetalleDto } from './dto/update-items-reparto-detalle.dto';
import { CreateItemsRepartoDetalleDto } from './dto/create-items-reparto-detalle.dto';
import { CreateItemRepartoConDetallesDto } from './dto/create-items-reparto-con-detalles.dto';
import { CreateItemsRepartoMultipleDto } from './dto/create-items-reparto-multiple.dto';

@Injectable()
export class ItemsRepartoService {
  constructor(private prisma: PrismaService) {}

  // ==================== CREAR ÍTEM CON DETALLES ====================
  async createFromCalidades(dto: CreateItemRepartoConDetallesDto) {
    const items = await this.createMultipleFromCalidades({
      id_detalle_carga: dto.id_detalle_carga,
      asignaciones: [{ ...dto }],
    });
    return items[0];
  }

  private async assertEditable(detalleId: number | bigint) {
    const detalle = await this.prisma.scoped.detalle_carga.findUnique({
      where: { id_detalle_carga: detalleId },
      include: { operaciones_carga: true },
    });
    if (!detalle) throw new NotFoundException('Carga no encontrada.');
    if (!operacionAbierta(detalle.operaciones_carga.estado))
      throw new BadRequestException(
        'La carga ya fue confirmada. No se pueden cambiar sus destinos.',
      );
    return detalle;
  }

  // ==================== CRUD ====================
  private async bloquear(tx: any, detalleId: number | bigint) {
    const ref = await tx.detalle_carga.findUnique({ where: { id_detalle_carga: detalleId } });
    if (!ref) throw new NotFoundException('Carga no encontrada.');
    await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${ref.id_operacion} FOR UPDATE`;
    const op = await tx.operaciones_carga.findUniqueOrThrow({ where: { id_operacion: ref.id_operacion } });
    if (!operacionAbierta(op.estado)) throw new BadRequestException('La operación está cerrada.');
    return ref;
  }
  private async receptorValido(tx: any, cliente: number | bigint | null, puesto: number | bigint | null) {
    if (!cliente || !puesto) throw new BadRequestException('Indica receptor y puesto.');
    if (!await tx.clientes_puestos.findFirst({ where: { id_cliente: cliente, id_puesto: puesto, estado: true, fecha_fin: null } }))
      throw new BadRequestException('El receptor no tiene una ocupación vigente en ese puesto.');
  }
  async create(dto: CreateItemRepartoDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const carga = await this.bloquear(tx, dto.id_detalle_carga);
      if (carga.es_reparto) throw new BadRequestException('Asigna las calidades explícitamente.');
      const usados = await tx.items_reparto.aggregate({ where: { id_detalle_carga: dto.id_detalle_carga }, _sum: { cantidad_asignada: true } });
      if (dto.cantidad_asignada <= 0 || !Number.isInteger(dto.cantidad_asignada) || (usados._sum.cantidad_asignada || 0) + dto.cantidad_asignada > carga.cantidad_jabas) throw new BadRequestException('La cantidad supera el saldo de la línea.');
      await this.receptorValido(tx, dto.id_cliente_receptor, dto.id_puesto);
      return tx.items_reparto.create({ data: { ...dto, id_empresa: carga.id_empresa } });
    });
  }

  async findAll(query: QueryItemsRepartoDto) {
    const where: any = {};
    if (query.id_detalle_carga)
      where.id_detalle_carga = BigInt(query.id_detalle_carga);
    if (query.id_cliente_receptor)
      where.id_cliente_receptor = BigInt(query.id_cliente_receptor);
    if (query.id_puesto) where.id_puesto = BigInt(query.id_puesto);
    if (query.seccion) where.seccion = query.seccion;

    const items = await this.prisma.scoped.items_reparto.findMany({
      where,
      include: {
        detalle_carga: {
          include: {
            operaciones_carga: {
              include: {
                camiones: true,
                sedes_operaciones_carga_id_sede_origenTosedes: true,
              },
            },
          },
        },
        clientes: true,
        puestos: {
          include: { lugares_operativos: true },
        },
        entregas: true,
        items_reparto_detalle: {
          include: {
            detalle_carga_calidades: {
              include: { calidades: true },
            },
          },
        },
      },
      orderBy: { orden_entrega: 'asc' },
    });

    if (items.length === 0) return items;

    // Obtener las guías vinculadas directamente a los items obtenidos
    // Usamos la relación explícita id_item_reparto para evitar cualquier
    // coincidencia por puesto, operación u otro contexto.
    const itemIds = items.map((item) => item.id_item_reparto);

    const guias = await this.prisma.scoped.guias_operativas.findMany({
      where: {
        id_item_reparto: { in: itemIds },
        id_puesto: { not: null },
      },
      include: {
        items_reparto: {
          select: { id_item_reparto: true },
        },
      },
    });

    const guiaPorItem = new Map<string, any>();
    for (const guia of guias) {
      const key = String(guia.id_item_reparto);
      if (!guiaPorItem.has(key)) {
        guiaPorItem.set(key, guia);
      }
    }

    return items.map((item) => ({
      ...item,
      guia_asociada: guiaPorItem.get(String(item.id_item_reparto)) || null,
    }));
  }
  async findOne(id: number) {
    const item = await this.prisma.scoped.items_reparto.findUnique({
      where: { id_item_reparto: BigInt(id) },
      include: {
        detalle_carga: true,
        clientes: true,
        puestos: true,
        entregas: true,
        items_reparto_detalle: {
          include: {
            detalle_carga_calidades: {
              include: { calidades: true },
            },
          },
        },
      },
    });
    if (!item)
      throw new NotFoundException(`Item de reparto con ID ${id} no encontrado`);
    return item;
  }

  async update(id: number, dto: UpdateItemRepartoDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const ref = await tx.items_reparto.findUnique({ where: { id_item_reparto: id } });
      if (!ref) throw new NotFoundException('Destino no encontrado.');
      const carga = await this.bloquear(tx, ref.id_detalle_carga);
      const item = await tx.items_reparto.findUniqueOrThrow({ where: { id_item_reparto: id }, include: { entregas: true, guias_operativas: true, items_reparto_detalle: true, resoluciones_reparto: true } });
      if (item.entregas.length || item.resoluciones_reparto.length || item.guias_operativas.some((g) => !['anulada','reemplazada'].includes(g.estado || ''))) throw new BadRequestException('El destino tiene movimientos físicos o una guía vigente.');
      if (dto.id_detalle_carga !== undefined && BigInt(dto.id_detalle_carga) !== item.id_detalle_carga) throw new BadRequestException('No se puede mover el destino a otra línea.');
      const cantidad = dto.cantidad_asignada ?? item.cantidad_asignada;
      const usados = await tx.items_reparto.aggregate({ where: { id_detalle_carga: item.id_detalle_carga, id_item_reparto: { not: item.id_item_reparto } }, _sum: { cantidad_asignada: true } });
      if (cantidad <= 0 || !Number.isInteger(cantidad) || cantidad + (usados._sum.cantidad_asignada || 0) > carga.cantidad_jabas) throw new BadRequestException('Cantidad fuera del saldo de la línea.');
      if (carga.es_reparto && cantidad !== item.items_reparto_detalle.reduce((sum, d) => sum + d.cantidad, 0)) throw new BadRequestException('Reajusta explícitamente el desglose de calidades.');
      await this.receptorValido(tx, dto.id_cliente_receptor ?? item.id_cliente_receptor, dto.id_puesto ?? item.id_puesto);
      return tx.items_reparto.update({ where: { id_item_reparto: id }, data: dto });
    });
  }
  async remove(id: number) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const ref = await tx.items_reparto.findUnique({ where: { id_item_reparto: id } });
      if (!ref) throw new NotFoundException('Destino no encontrado.');
      await this.bloquear(tx, ref.id_detalle_carga);
      const item = await tx.items_reparto.findUniqueOrThrow({ where: { id_item_reparto: id }, include: { entregas: true, guias_operativas: true, resoluciones_reparto: true } });
      if (item.entregas.length || item.guias_operativas.length || item.resoluciones_reparto.length) throw new BadRequestException('Este destino tiene historial; corrígelo explícitamente sin eliminarlo.');
      await tx.items_reparto_detalle.deleteMany({ where: { id_item_reparto: id } });
      return tx.items_reparto.delete({ where: { id_item_reparto: id } });
    });
  }

  async reajustar(id: number, dto: CreateItemRepartoConDetallesDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const ref = await tx.items_reparto.findUnique({ where: { id_item_reparto: id } });
      if (!ref || ref.id_detalle_carga !== BigInt(dto.id_detalle_carga)) throw new NotFoundException('El ítem no pertenece a la línea indicada.');
      const carga = await this.bloquear(tx, ref.id_detalle_carga);
      const item = await tx.items_reparto.findUniqueOrThrow({ where: { id_item_reparto: id }, include: { entregas: true, guias_operativas: true, resoluciones_reparto: true } });
      if (item.entregas.length || item.resoluciones_reparto.length || item.guias_operativas.some((g) => !['anulada','reemplazada'].includes(g.estado || ''))) throw new BadRequestException('Anula la guía antes de reajustar. Los movimientos físicos no se reescriben.');
      if (!carga.es_reparto || !dto.detalles.length) throw new BadRequestException('El reajuste requiere una carga clasificada y un desglose.');
      await this.receptorValido(tx, dto.id_cliente_receptor, dto.id_puesto);
      const solicitado = new Map<number, number>();
      for (const d of dto.detalles) {
        if (!Number.isInteger(d.cantidad) || d.cantidad <= 0 || (d.precio_unitario != null && (!Number.isFinite(d.precio_unitario) || d.precio_unitario < 0))) throw new BadRequestException('Cantidad o precio inválido.');
        solicitado.set(d.id_detalle_carga_calidad, (solicitado.get(d.id_detalle_carga_calidad) || 0) + d.cantidad);
      }
      for (const [calidadId, cantidad] of solicitado) {
        const calidad = await tx.detalle_carga_calidades.findUnique({ where: { id_detalle_carga_calidad: calidadId } });
        if (!calidad || calidad.id_detalle_carga !== ref.id_detalle_carga) throw new BadRequestException('La calidad no pertenece a la línea.');
        const usado = await tx.items_reparto_detalle.aggregate({ where: { id_detalle_carga_calidad: calidadId, id_item_reparto: { not: BigInt(id) } }, _sum: { cantidad: true } });
        if ((usado._sum.cantidad || 0) + cantidad > calidad.cantidad) throw new BadRequestException('La asignación supera el saldo de calidad.');
      }
      const total = [...solicitado.values()].reduce((sum, c) => sum + c, 0);
      const otros = await tx.items_reparto.aggregate({ where: { id_detalle_carga: ref.id_detalle_carga, id_item_reparto: { not: BigInt(id) } }, _sum: { cantidad_asignada: true } });
      if ((otros._sum.cantidad_asignada || 0) + total > carga.cantidad_jabas) throw new BadRequestException('La asignación supera la carga.');
      await tx.items_reparto_detalle.deleteMany({ where: { id_item_reparto: id } });
      for (const d of dto.detalles) await tx.items_reparto_detalle.create({ data: { ...d, id_item_reparto: id, id_empresa: ref.id_empresa } });
      return tx.items_reparto.update({ where: { id_item_reparto: id }, data: { id_cliente_receptor: dto.id_cliente_receptor, id_puesto: dto.id_puesto, cantidad_asignada: total, observaciones: dto.observaciones, seccion: dto.seccion }, include: { items_reparto_detalle: true } });
    });
  }

  async resolver(id: number, dto: { tipo: string; cantidad: number; motivo: string; clave_idempotencia: string }) {
    const actor = exigirSupervisor();
    if (!['devolucion','merma'].includes(dto.tipo) || !Number.isInteger(dto.cantidad) || dto.cantidad <= 0 || !dto.motivo?.trim() || !dto.clave_idempotencia?.trim()) throw new BadRequestException('Indica tipo, cantidad positiva, motivo y clave de solicitud.');
    return this.prisma.scoped.$transaction(async (tx) => {
      const ref = await tx.items_reparto.findUnique({ where: { id_item_reparto: id } });
      if (!ref) throw new NotFoundException('Destino no encontrado.');
      const carga = await this.bloquear(tx, ref.id_detalle_carga);
      const op = await tx.operaciones_carga.findUniqueOrThrow({ where: { id_operacion: carga.id_operacion } });
      if (op.estado !== 'repartiendo') throw new BadRequestException('Las resoluciones físicas se registran durante el reparto.');
      const previa = await tx.resoluciones_reparto.findFirst({ where: { clave_idempotencia: dto.clave_idempotencia } });
      if (previa) {
        if (previa.id_item_reparto !== BigInt(id) || previa.cantidad !== dto.cantidad || previa.tipo !== dto.tipo || previa.motivo !== dto.motivo.trim()) throw new BadRequestException('La clave ya identifica otra resolución.');
        return previa;
      }
      const item = await tx.items_reparto.findUniqueOrThrow({ where: { id_item_reparto: id }, include: { entregas: true, resoluciones_reparto: true } });
      const recibidas = item.entregas.filter((e) => e.estado_entrega !== 'pendiente').reduce((sum, e) => sum + e.cantidad_entregada, 0);
      const resueltas = item.resoluciones_reparto.reduce((sum, r) => sum + r.cantidad, 0);
      if (recibidas + resueltas + dto.cantidad > item.cantidad_asignada) throw new BadRequestException('La resolución supera el saldo físico.');
      return tx.resoluciones_reparto.create({ data: { ...dto, motivo: dto.motivo.trim(), id_item_reparto: id, id_empresa: actor.empresaId, id_usuario: actor.usuarioId } });
    });
  }

  // ==================== DETALLES ====================
  async addDetalle(id: number, dto?: unknown) {
    throw new BadRequestException(
      'Para cambiar las calidades de un destino, elimina la asignación y vuelve a crearla antes de confirmar la carga.',
    );
  }

  async findAllDetalles(itemId?: number) {
    const where: any = {};
    if (itemId) where.id_item_reparto = BigInt(itemId);

    return this.prisma.scoped.items_reparto_detalle.findMany({
      where,
      include: {
        detalle_carga_calidades: {
          include: { calidades: true },
        },
        items_reparto: true,
      },
    });
  }

  async findOneDetalle(id: number) {
    const detalle = await this.prisma.scoped.items_reparto_detalle.findUnique({
      where: { id_item_reparto_detalle: BigInt(id) },
      include: {
        detalle_carga_calidades: { include: { calidades: true } },
        items_reparto: true,
      },
    });
    if (!detalle)
      throw new NotFoundException(
        `Detalle de reparto con ID ${id} no encontrado`,
      );
    return detalle;
  }

  async updateDetalle(id: number, dto?: unknown) {
    throw new BadRequestException(
      'Para cambiar las calidades de un destino, elimina la asignación y vuelve a crearla antes de confirmar la carga.',
    );
  }

  async removeDetalle(id: number, dto?: unknown) {
    throw new BadRequestException(
      'Para cambiar las calidades de un destino, elimina la asignación y vuelve a crearla antes de confirmar la carga.',
    );
  }

  // ==================== AUXILIARES ====================
  private async validateCantidadDisponible(
    detalleId: number,
    cantidadAsignar: number,
    excludeItemId?: number,
  ) {
    const detalle = await this.prisma.scoped.detalle_carga.findUnique({
      where: { id_detalle_carga: BigInt(detalleId) },
    });
    if (!detalle) throw new NotFoundException('Detalle no encontrado');

    const whereItem: any = { id_detalle_carga: BigInt(detalleId) };
    if (excludeItemId) {
      whereItem.NOT = { id_item_reparto: BigInt(excludeItemId) };
    }

    const asignadoTotal = await this.prisma.scoped.items_reparto.aggregate({
      where: whereItem,
      _sum: { cantidad_asignada: true },
    });
    const yaAsignado = Number(asignadoTotal._sum.cantidad_asignada) || 0;

    if (yaAsignado + cantidadAsignar > detalle.cantidad_jabas) {
      throw new BadRequestException(
        `La cantidad excede el total del detalle (${detalle.cantidad_jabas - yaAsignado} restante)`,
      );
    }
  }

  private async validateRelations(dto: any) {
    if (dto.id_detalle_carga) {
      const exists = await this.prisma.scoped.detalle_carga.findUnique({
        where: { id_detalle_carga: BigInt(dto.id_detalle_carga) },
      });
      if (!exists)
        throw new BadRequestException(
          `Detalle de carga ID ${dto.id_detalle_carga} no existe`,
        );
    }
    if (dto.id_cliente_receptor) {
      const exists = await this.prisma.scoped.clientes.findUnique({
        where: { id_cliente: BigInt(dto.id_cliente_receptor) },
      });
      if (!exists)
        throw new BadRequestException(
          `Cliente receptor ID ${dto.id_cliente_receptor} no existe`,
        );
    }
    if (dto.id_puesto) {
      const exists = await this.prisma.scoped.puestos.findUnique({
        where: { id_puesto: BigInt(dto.id_puesto) },
      });
      if (!exists)
        throw new BadRequestException(`Puesto ID ${dto.id_puesto} no existe`);
    }
  }

  // ==================== ENDPOINTS ANIDADOS ====================
  async findByDetalleCarga(detalleId: number) {
    const detalle = await this.prisma.scoped.detalle_carga.findUnique({
      where: { id_detalle_carga: BigInt(detalleId) },
    });
    if (!detalle)
      throw new NotFoundException(
        `Detalle de carga con ID ${detalleId} no existe`,
      );

    return this.prisma.scoped.items_reparto.findMany({
      where: { id_detalle_carga: BigInt(detalleId) },
      include: {
        clientes: true,
        puestos: true,
        entregas: true,
        items_reparto_detalle: {
          include: {
            detalle_carga_calidades: { include: { calidades: true } },
          },
        },
      },
    });
  }

  async createMultipleFromCalidades(dto: CreateItemsRepartoMultipleDto) {
    if (
      !dto.asignaciones?.length ||
      dto.asignaciones.some((a) => !a.detalles?.length)
    )
      throw new BadRequestException(
        'Agrega al menos una calidad y un destino.',
      );
    return this.prisma.scoped.$transaction(async (tx) => {
      const ref = await tx.detalle_carga.findUnique({
        where: { id_detalle_carga: dto.id_detalle_carga },
      });
      if (!ref) throw new NotFoundException('Carga no encontrada.');
      await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${ref.id_operacion} FOR UPDATE`;
      const detalle = await tx.detalle_carga.findUnique({
        where: { id_detalle_carga: dto.id_detalle_carga },
        include: {
          operaciones_carga: true,
          detalle_carga_calidades: true,
          items_reparto: { include: { items_reparto_detalle: true } },
        },
      });
      if (!detalle || !operacionAbierta(detalle.operaciones_carga.estado))
        throw new BadRequestException(
          'La carga ya fue confirmada o está cancelada.',
        );
      if (!detalle.es_reparto)
        throw new BadRequestException(
          'Esta carga es de entrega directa y ya tiene un destino.',
        );
      if (
        detalle.detalle_carga_calidades.reduce(
          (sum, c) => sum + c.cantidad,
          0,
        ) !== detalle.cantidad_jabas
      )
        throw new BadRequestException(
          'Completa la clasificación por calidad antes de asignar los destinos.',
        );
      const solicitado = new Map<number, number>();
      for (const asignacion of dto.asignaciones) {
        const relacion = await tx.clientes_puestos.findFirst({
          where: {
            id_empresa: detalle.id_empresa,
            id_cliente: asignacion.id_cliente_receptor,
            id_puesto: asignacion.id_puesto,
            estado: true,
            fecha_fin: null,
          },
        });
        if (!relacion)
          throw new BadRequestException(
            'El receptor no tiene un puesto activo en esta empresa.',
          );
        for (const d of asignacion.detalles) {
          if (
            !Number.isInteger(d.cantidad) ||
            d.cantidad <= 0 ||
            (d.precio_unitario != null &&
              (!Number.isFinite(d.precio_unitario) || d.precio_unitario < 0))
          )
            throw new BadRequestException(
              'Revisa las cantidades y precios del destino.',
            );
          if (
            !detalle.detalle_carga_calidades.some(
              (c) =>
                Number(c.id_detalle_carga_calidad) ===
                d.id_detalle_carga_calidad,
            )
          )
            throw new BadRequestException(
              'La calidad no pertenece a esta carga.',
            );
          solicitado.set(
            d.id_detalle_carga_calidad,
            (solicitado.get(d.id_detalle_carga_calidad) || 0) + d.cantidad,
          );
        }
      }
      const asignaciones = detalle.items_reparto.flatMap(
        (i) => i.items_reparto_detalle,
      );
      for (const calidad of detalle.detalle_carga_calidades) {
        const usado = asignaciones
          .filter(
            (d) =>
              d.id_detalle_carga_calidad === calidad.id_detalle_carga_calidad,
          )
          .reduce((sum, d) => sum + d.cantidad, 0);
        if (
          usado +
            (solicitado.get(Number(calidad.id_detalle_carga_calidad)) || 0) >
          calidad.cantidad
        )
          throw new BadRequestException(
            'La cantidad supera las jabas disponibles de esa calidad. Actualiza la carga y revisa el saldo.',
          );
      }
      const nuevaCantidad = [...solicitado.values()].reduce(
        (sum, c) => sum + c,
        0,
      );
      if (
        detalle.items_reparto.reduce((sum, i) => sum + i.cantidad_asignada, 0) +
          nuevaCantidad >
        detalle.cantidad_jabas
      )
        throw new BadRequestException(
          'La cantidad asignada supera el total de la carga.',
        );
      const items = [] as Awaited<ReturnType<typeof tx.items_reparto.create>>[];
      for (const asignacion of dto.asignaciones) {
        const item = await tx.items_reparto.create({
          data: {
            id_empresa: detalle.id_empresa,
            id_detalle_carga: detalle.id_detalle_carga,
            id_cliente_receptor: asignacion.id_cliente_receptor,
            id_puesto: asignacion.id_puesto,
            cantidad_asignada: asignacion.detalles.reduce(
              (sum, d) => sum + d.cantidad,
              0,
            ),
            seccion: asignacion.seccion,
            orden_entrega: asignacion.orden_entrega,
            observaciones: asignacion.observaciones,
          },
        });
        for (const d of asignacion.detalles)
          await tx.items_reparto_detalle.create({
            data: {
              id_empresa: detalle.id_empresa,
              id_item_reparto: item.id_item_reparto,
              id_detalle_carga_calidad: d.id_detalle_carga_calidad,
              cantidad: d.cantidad,
              precio_unitario: d.precio_unitario,
            },
          });
        items.push(item);
      }
      return items;
    });
  }
}
