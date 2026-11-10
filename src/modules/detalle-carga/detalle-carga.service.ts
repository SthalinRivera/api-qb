import { operacionAbierta } from '../operaciones-carga/estados-operacion';
import { Prisma } from '@prisma/client';
import { cargaEditable } from '../operaciones-carga/flujo-operacion';
// detalle-carga.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateDetalleCargaDto } from './dto/create-detalle-carga.dto';
import { CreateDetalleCargaForOperacionDto } from './dto/create-detalle-carga-for-operacion.dto';
import { UpdateDetalleCargaDto } from './dto/update-detalle-carga.dto';
import { CreateDetalleCalidadDto } from './dto/create-detalle-calidad.dto';
import { UpdateDetalleCalidadDto } from './dto/update-detalle-calidad.dto';

@Injectable()
export class DetalleCargaService {
  constructor(private prisma: PrismaService) {}

  private async editableDetalle(tx: Prisma.TransactionClient, id: number) {
    const ref = await tx.detalle_carga.findUnique({
      where: { id_detalle_carga: id },
    });
    if (!ref) throw new NotFoundException('Producto de carga no encontrado.');
    await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${ref.id_operacion} FOR UPDATE`;
    const detalle = await tx.detalle_carga.findUniqueOrThrow({
      where: { id_detalle_carga: id },
      include: {
        operaciones_carga: true,
        detalle_carga_calidades: true,
        items_reparto: { include: { entregas: true, guias_operativas: true } },
      },
    });
    if (!operacionAbierta(detalle.operaciones_carga.estado))
      throw new BadRequestException(
        'Esta carga ya fue confirmada o está cancelada y no puede modificarse.',
      );
    return detalle;
  }

  async create(operacionId: number, dto: CreateDetalleCargaForOperacionDto) {
    const operacion = await this.prisma.scoped.operaciones_carga.findUnique({
      where: { id_operacion: operacionId },
    });
    if (!operacion)
      throw new NotFoundException(`Operación con ID ${operacionId} no existe`);
    if (!operacionAbierta(operacion.estado)) {
      throw new BadRequestException(
        'No se puede agregar detalles a una operación en tránsito o cancelada',
      );
    }

    if (!dto.es_reparto && (!dto.id_cliente_receptor || !dto.id_puesto))
      throw new BadRequestException(
        'Selecciona receptor y puesto para la entrega directa.',
      );
    if (dto.es_reparto && (dto.id_cliente_receptor || dto.id_puesto))
      throw new BadRequestException(
        'Asigna los receptores después de clasificar la carga para reparto.',
      );
    await this.validateRelations(dto);

    return this.prisma.scoped.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${BigInt(operacionId)} FOR UPDATE`;
      const actual = await tx.operaciones_carga.findUniqueOrThrow({
        where: { id_operacion: operacionId },
      });
      if (!operacionAbierta(actual.estado))
        throw new BadRequestException('La carga ya fue confirmada.');
      const ultimo = await tx.detalle_carga.aggregate({ where: { id_operacion: operacionId }, _max: { orden_carga: true } });
      const orden = dto.orden_carga ?? (ultimo._max.orden_carga || 0) + 1;
      if (await tx.detalle_carga.count({ where: { id_operacion: operacionId, orden_carga: orden } })) throw new BadRequestException('El orden ya está ocupado.');
      // 1. Crear detalle de carga
      const detalle = await tx.detalle_carga.create({
        data: {
          id_empresa: operacion.id_empresa,
          id_operacion: operacionId,
          orden_carga: orden,
          id_cliente_emisor: dto.id_cliente_emisor,
          id_fruta: dto.id_fruta,
          id_variedad: dto.id_variedad,
          id_tipo_jaba: dto.id_tipo_jaba,
          cantidad_jabas: dto.cantidad_jabas,
          es_reparto: dto.es_reparto ?? false,
          instruccion_reparto: dto.instruccion_reparto,
          observaciones: dto.observaciones,
          requiere_retorno_jabas: dto.requiere_retorno_jabas ?? false,
        },
      });

      let itemReparto: any = null;

      // 2. Crear item de reparto si se especificó cliente receptor y puesto
      if (dto.id_cliente_receptor && dto.id_puesto) {
        const relacion = await tx.clientes_puestos.findFirst({
          where: {
            id_cliente: dto.id_cliente_receptor,
            id_puesto: dto.id_puesto,
            fecha_fin: null,
            estado: true,
          },
          select: { seccion: true },
        });
        if (!relacion) {
          throw new BadRequestException(
            `El cliente receptor no tiene el puesto ${dto.id_puesto} activo.`,
          );
        }

        const seccionFinal = dto.id_seccion ?? relacion.seccion;

        itemReparto = await tx.items_reparto.create({
          data: {
            id_empresa: operacion.id_empresa,
            id_detalle_carga: detalle.id_detalle_carga,
            id_cliente_receptor: dto.id_cliente_receptor,
            id_puesto: dto.id_puesto,
            cantidad_asignada: detalle.cantidad_jabas,
            seccion: seccionFinal,
            orden_entrega: null,
            observaciones: dto.instruccion_reparto,
          },
          include: { clientes: true, puestos: true },
        });
      }

      // El compromiso con el emisor nace en la carga; el cobro al receptor nace en la entrega.
      if (detalle.requiere_retorno_jabas)
        await tx.jabas_por_pagar.create({
          data: {
            id_empresa: operacion.id_empresa,
            id_entrega: null,
            id_cliente_emisor: detalle.id_cliente_emisor,
            id_tipo_jaba: detalle.id_tipo_jaba,
            fecha_origen: new Date(),
            cantidad_original: detalle.cantidad_jabas,
            cantidad_pagada: 0,
            saldo_pendiente: detalle.cantidad_jabas,
            estado: 'pendiente',
            observaciones:
              'Generado automáticamente al crear detalle de carga #' +
              detalle.id_detalle_carga,
          },
        });
      // Actualizar estado de operación
      if (operacion.estado === 'pendiente') {
        await tx.operaciones_carga.update({
          where: { id_operacion: operacionId },
          data: { estado: 'en_curso' },
        });
      }

      return {
        ...detalle,
        item_reparto: itemReparto,
      };
    });
  }

  /**
   * Obtiene todos los detalles de carga de una operación específica.
   * Incluye las relaciones: cliente, fruta, variedad, tipo de jaba y calidades.
   */
  // detalle-carga.service.ts
  async findByOperacion(operacionId: number) {
    const operacion = await this.prisma.scoped.operaciones_carga.findUnique({
      where: { id_operacion: operacionId },
    });
    if (!operacion) {
      throw new NotFoundException(`Operación con ID ${operacionId} no existe`);
    }

    return this.prisma.scoped.detalle_carga.findMany({
      where: { id_operacion: operacionId },
      include: {
        clientes: true,
        frutas: true,
        variedades: true,
        tipos_jaba: true,
        detalle_carga_calidades: { include: { calidades: true } },
        items_reparto: {
          // 🔥 incluimos el item de reparto
          include: {
            clientes: true, // para el nombre del cliente receptor
            entregas: true,
            puestos: true,
            guias_operativas: true, // 🔥 la guía asociada (si existe)
          },
        },
      },
      orderBy: { orden_carga: 'asc' },
    });
  }

  /**
   * Obtiene un detalle de carga por su ID, con todas sus relaciones.
   */
  async findOne(id: number) {
    const detalle = await this.prisma.scoped.detalle_carga.findUnique({
      where: { id_detalle_carga: id },
      include: {
        clientes: true,
        frutas: true,
        variedades: true,
        tipos_jaba: true,
        detalle_carga_calidades: {
          include: { calidades: true },
        },
      },
    });
    if (!detalle) {
      throw new NotFoundException(
        `Detalle de carga con ID ${id} no encontrado`,
      );
    }
    return detalle;
  }

  /**
   * Actualiza un detalle de carga existente.
   * No se permite cambiar el item de reparto asociado (se gestiona aparte).
   */
  async update(id: number, dto: UpdateDetalleCargaDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const detalle = await this.editableDetalle(tx, id);
      if (!Object.keys(dto).length)
        throw new BadRequestException('No se enviaron cambios.');
      if (dto.es_reparto !== undefined && dto.es_reparto !== detalle.es_reparto)
        throw new BadRequestException(
          'El tipo de entrega no puede cambiarse después de crear el producto.',
        );
      if (dto.orden_carga !== undefined && await tx.detalle_carga.count({ where: { id_operacion: detalle.id_operacion, orden_carga: dto.orden_carga, id_detalle_carga: { not: detalle.id_detalle_carga } } })) throw new BadRequestException('El orden ya está ocupado.');
      if (detalle.items_reparto.some((i) => i.entregas.length || i.guias_operativas.some((g) => !['anulada','reemplazada'].includes(g.estado || ''))))
        throw new BadRequestException('El producto tiene entregas o guías vigentes. Anula la guía antes de corregir; las entregas registradas son inmutables.');
      const cambiaDeuda =
        (dto.cantidad_jabas !== undefined &&
          dto.cantidad_jabas !== detalle.cantidad_jabas) ||
        (dto.id_cliente_emisor !== undefined &&
          BigInt(dto.id_cliente_emisor) !== detalle.id_cliente_emisor) ||
        (dto.id_tipo_jaba !== undefined &&
          BigInt(dto.id_tipo_jaba) !== detalle.id_tipo_jaba) ||
        (dto.requiere_retorno_jabas !== undefined &&
          dto.requiere_retorno_jabas !== detalle.requiere_retorno_jabas);
      if (
        cambiaDeuda &&
        (detalle.requiere_retorno_jabas || dto.requiere_retorno_jabas)
      )
        throw new BadRequestException(
          'Esta carga tiene retorno de jabas. Para cambiar cantidades o emisor, revisa primero su saldo de jabas por pagar.',
        );
      const clasificado = detalle.detalle_carga_calidades.reduce(
        (sum, c) => sum + c.cantidad,
        0,
      );
      const asignado = detalle.items_reparto.reduce(
        (sum, i) => sum + i.cantidad_asignada,
        0,
      );
      if (dto.cantidad_jabas !== undefined) {
        if (
          !Number.isInteger(dto.cantidad_jabas) ||
          dto.cantidad_jabas <= 0 ||
          dto.cantidad_jabas < clasificado
        )
          throw new BadRequestException(
            'La cantidad debe ser positiva y no menor que las jabas clasificadas.',
          );
        if (detalle.es_reparto && dto.cantidad_jabas < asignado)
          throw new BadRequestException(
            'Primero quita los destinos que necesitas reasignar.',
          );
        if (!detalle.es_reparto && detalle.items_reparto.length > 1)
          throw new BadRequestException(
            'Esta carga tiene varios destinos. Revisa sus asignaciones antes de cambiar la cantidad.',
          );
        if (!detalle.es_reparto && detalle.items_reparto.length === 1)
          await tx.items_reparto.update({
            where: {
              id_item_reparto: detalle.items_reparto[0].id_item_reparto,
            },
            data: { cantidad_asignada: dto.cantidad_jabas },
          });
      }
      await this.validateRelations(dto);
      return tx.detalle_carga.update({
        where: { id_detalle_carga: id },
        data: {
          orden_carga: dto.orden_carga,
          id_cliente_emisor: dto.id_cliente_emisor,
          id_fruta: dto.id_fruta,
          id_variedad: dto.id_variedad,
          id_tipo_jaba: dto.id_tipo_jaba,
          cantidad_jabas: dto.cantidad_jabas,
          instruccion_reparto: dto.instruccion_reparto,
          observaciones: dto.observaciones,
          requiere_retorno_jabas: dto.requiere_retorno_jabas,
        },
        include: {
          clientes: true,
          frutas: true,
          variedades: true,
          tipos_jaba: true,
        },
      });
    });
  }

  async remove(id: number) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const detalle = await this.editableDetalle(tx, id);
      if (detalle.requiere_retorno_jabas) {
        const deuda = await tx.jabas_por_pagar.findFirst({
          where: {
            id_empresa: detalle.id_empresa,
            observaciones:
              'Generado automáticamente al crear detalle de carga #' +
              detalle.id_detalle_carga,
          },
        });
        if (!deuda || deuda.cantidad_pagada > 0)
          throw new BadRequestException(
            'Esta carga tiene un saldo de jabas anterior o con pagos. Revisa Jabas por pagar antes de eliminarla.',
          );
        await tx.jabas_por_pagar.delete({
          where: { id_jaba_pagar: deuda.id_jaba_pagar },
        });
      }
      if (
        detalle.items_reparto.some(
          (i) => i.entregas.length || i.guias_operativas.length,
        )
      )
        throw new BadRequestException(
          'Este producto tiene entregas o guías y no puede eliminarse.',
        );
      const ids = detalle.items_reparto.map((i) => i.id_item_reparto);
      await tx.items_reparto_detalle.deleteMany({
        where: { id_item_reparto: { in: ids } },
      });
      await tx.items_reparto.deleteMany({ where: { id_detalle_carga: id } });
      return tx.detalle_carga.delete({ where: { id_detalle_carga: id } });
    });
  }

  // ==================== CALIDADES ====================

  /**
   * Obtiene todas las calidades asociadas a un detalle de carga.
   */
  async findCalidadesByDetalle(detalleId: number) {
    await this.findOne(detalleId);
    return this.prisma.scoped.detalle_carga_calidades.findMany({
      where: { id_detalle_carga: detalleId },
      include: { calidades: true },
    });
  }

  /**
   * Agrega una calidad a un detalle de carga.
   * Verifica que la calidad exista y que no esté ya asociada.
   */
  async addCalidad(detalleId: number, dto: CreateDetalleCalidadDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const referencia = await tx.detalle_carga.findUnique({
        where: { id_detalle_carga: detalleId },
      });
      if (!referencia) throw new NotFoundException('Carga no encontrada.');
      await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${referencia.id_operacion} FOR UPDATE`;
      const precioFinal =
        dto.precio_unitario == null ? null : Number(dto.precio_unitario);
      if (
        precioFinal !== null &&
        (!Number.isFinite(precioFinal) || precioFinal < 0)
      )
        throw new BadRequestException(
          'El precio debe ser un número mayor o igual a cero.',
        );
      // 1. Verificar que el detalle exista
      const detalle = await tx.detalle_carga.findUniqueOrThrow({
        where: { id_detalle_carga: detalleId },
        include: { detalle_carga_calidades: true },
      });

      // Verificar que la operación no esté en curso
      const operacion = await tx.operaciones_carga.findUnique({
        where: { id_operacion: detalle.id_operacion },
        select: { estado: true },
      });
      if (!operacion || !operacionAbierta(operacion.estado)) {
        throw new BadRequestException(
          'No se pueden modificar calidades de una operación en tránsito o cancelada',
        );
      }

      if (!detalle.es_reparto)
        throw new BadRequestException(
          'La entrega directa no requiere clasificación por calidad.',
        );
      const total = detalle.detalle_carga_calidades.reduce(
        (sum, c) => sum + c.cantidad,
        0,
      );
      if (
        !Number.isInteger(dto.cantidad) ||
        dto.cantidad <= 0 ||
        total + dto.cantidad > detalle.cantidad_jabas
      )
        throw new BadRequestException(
          'La cantidad de calidad excede las jabas pendientes de clasificar.',
        );
      // 2. Verificar que la calidad exista
      const calidad = await tx.calidades.findUnique({
        where: { id_calidad: dto.id_calidad },
      });
      if (!calidad) {
        throw new NotFoundException(
          `Calidad con ID ${dto.id_calidad} no existe`,
        );
      }

      // 3. Evitar duplicado de la misma calidad en el mismo detalle
      const existing = await tx.detalle_carga_calidades.findFirst({
        where: {
          id_detalle_carga: detalleId,
          id_calidad: dto.id_calidad,
        },
      });
      if (existing) {
        throw new BadRequestException(
          `La calidad ya está asociada a este detalle`,
        );
      }

      // 4. Crear la calidad en detalle_carga_calidades
      const nuevaCalidad = await tx.detalle_carga_calidades.create({
        data: {
          id_empresa: detalle.id_empresa,
          id_detalle_carga: detalleId,
          id_calidad: dto.id_calidad,
          cantidad: dto.cantidad,
          precio_unitario: precioFinal, // <-- USAR EL VALOR SANEADO
        },
        include: { calidades: true },
      });

      return nuevaCalidad;
    });
  }
  /**
   * Actualiza la cantidad y/o precio unitario de una calidad asociada.
   */
  async updateCalidad(calidadId: number, dto: UpdateDetalleCalidadDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const calidad = await tx.detalle_carga_calidades.findUnique({
        where: { id_detalle_carga_calidad: calidadId },
      });
      if (!calidad) throw new NotFoundException('Calidad no encontrada.');
      const detalle = await this.editableDetalle(
        tx,
        Number(calidad.id_detalle_carga),
      );
      const asignaciones = await tx.items_reparto_detalle.findMany({ where: { id_detalle_carga_calidad: calidadId }, include: { items_reparto: { include: { entregas: true, guias_operativas: true } } } });
      const asignado = asignaciones.reduce((sum, a) => sum + a.cantidad, 0);
      if (dto.cantidad !== undefined && dto.cantidad < asignado) throw new BadRequestException('Reajusta primero las asignaciones: la calidad no puede quedar por debajo de lo asignado.');
      if (dto.id_calidad !== undefined && BigInt(dto.id_calidad) !== calidad.id_calidad && asignado > 0) throw new BadRequestException('La calidad ya está asignada. Reajusta el desglose antes de cambiar su identidad.');
      if (asignaciones.some((a) => a.items_reparto.entregas.length || a.items_reparto.guias_operativas.some((g) => !['anulada','reemplazada'].includes(g.estado || '')))) throw new BadRequestException('La calidad está documentada o entregada. Anula la guía antes de corregir.');
      const otras = detalle.detalle_carga_calidades
        .filter(
          (c) =>
            c.id_detalle_carga_calidad !== calidad.id_detalle_carga_calidad,
        )
        .reduce((sum, c) => sum + c.cantidad, 0);
      if (
        dto.cantidad !== undefined &&
        (!Number.isInteger(dto.cantidad) ||
          dto.cantidad <= 0 ||
          otras + dto.cantidad > detalle.cantidad_jabas)
      )
        throw new BadRequestException(
          'La cantidad excede las jabas pendientes de clasificar.',
        );
      if (
        dto.precio_unitario != null &&
        (!Number.isFinite(dto.precio_unitario) || dto.precio_unitario < 0)
      )
        throw new BadRequestException('El precio no es válido.');
      return tx.detalle_carga_calidades.update({
        where: { id_detalle_carga_calidad: calidadId },
        data: { id_calidad: dto.id_calidad, cantidad: dto.cantidad, precio_unitario: dto.precio_unitario },
        include: { calidades: true },
      });
    });
  }

  async removeCalidad(calidadId: number) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const calidad = await tx.detalle_carga_calidades.findUnique({
        where: { id_detalle_carga_calidad: calidadId },
      });
      if (!calidad) throw new NotFoundException('Calidad no encontrada.');
      await this.editableDetalle(tx, Number(calidad.id_detalle_carga));
      if (
        await tx.items_reparto_detalle.count({
          where: { id_detalle_carga_calidad: calidadId },
        })
      )
        throw new BadRequestException(
          'Quita primero el destino asignado a esta calidad para poder eliminarla.',
        );
      return tx.detalle_carga_calidades.delete({
        where: { id_detalle_carga_calidad: calidadId },
      });
    });
  }

  // ==================== VALIDACIONES COMUNES ====================

  /**
   * Valida que las entidades referenciadas (cliente, fruta, variedad, tipo_jaba) existan.
   * Se usa tanto en creación como en actualización.
   */
  private async validateRelations(dto: any) {
    const { id_cliente_emisor, id_fruta, id_variedad, id_tipo_jaba } = dto;

    if (id_cliente_emisor) {
      const exists = await this.prisma.scoped.clientes.findUnique({
        where: { id_cliente: id_cliente_emisor },
      });
      if (!exists)
        throw new BadRequestException(
          `Cliente con ID ${id_cliente_emisor} no existe`,
        );
    }
    if (id_fruta) {
      const exists = await this.prisma.scoped.frutas.findUnique({
        where: { id_fruta },
      });
      if (!exists)
        throw new BadRequestException(`Fruta con ID ${id_fruta} no existe`);
    }
    if (id_variedad) {
      const exists = await this.prisma.scoped.variedades.findUnique({
        where: { id_variedad },
      });
      if (!exists)
        throw new BadRequestException(
          `Variedad con ID ${id_variedad} no existe`,
        );
    }
    if (id_tipo_jaba) {
      const exists = await this.prisma.scoped.tipos_jaba.findUnique({
        where: { id_tipo_jaba },
      });
      if (!exists)
        throw new BadRequestException(
          `Tipo de jaba con ID ${id_tipo_jaba} no existe`,
        );
    }
  }
}
