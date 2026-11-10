import { validarEntrega } from './validar-entrega';
import {
  cargaEditable,
  operacionCancelada,
  resumenFlujo,
} from '../operaciones-carga/flujo-operacion';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateEntregaDto } from './dto/create-entregas.dto';
import { UpdateEntregaDto } from './dto/update-entregas.dto';
import { QueryEntregasDto } from './dto/query-entregas.dto';

interface EntregaCreateDto extends CreateEntregaDto {
  requiere_retorno_jabas?: boolean;
  cantidad_jabas?: number;
  id_cliente_emisor?: number;
  id_tipo_jaba?: number;
}

@Injectable()
export class EntregasService {
  constructor(private prisma: PrismaService) {}

  // ==================== AUXILIAR ====================
  private parseHora(horaStr?: string): Date | null {
    if (!horaStr || typeof horaStr !== 'string') return null;
    const trimmed = horaStr.trim();
    if (trimmed === '') return null;
    let formatted = trimmed;
    if (trimmed.match(/^\d{2}:\d{2}$/)) {
      formatted = `${trimmed}:00`;
    }
    const date = new Date(`1970-01-01T${formatted}`);
    return isNaN(date.getTime()) ? null : date;
  }

  private async registrarLog(
    client: any,
    accion: string,
    tabla_afectada: string,
    id_registro: number | bigint | null,
    datos_anteriores: any,
    datos_nuevos: any,
    empresaId?: number,
    usuarioId?: number,
  ) {
    await client.logs_actividad.create({
      data: {
        id_empresa: empresaId ?? null,
        id_usuario: usuarioId ?? null,
        accion,
        tabla_afectada,
        id_registro,
        datos_anteriores,
        datos_nuevos,
      },
    });
  }

  // ==================== CRUD ====================
  async create(
    createDto: EntregaCreateDto,
    empresaId: number,
    usuarioId?: number,
  ) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const referencia = await tx.items_reparto.findUnique({
        where: { id_item_reparto: createDto.id_item_reparto },
        select: { detalle_carga: { select: { id_operacion: true } } },
      });
      if (!referencia)
        throw new NotFoundException('Destino de entrega no encontrado.');
      // Serializa el registro y evita duplicados por doble clic o solicitudes simultáneas.
      await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${referencia.detalle_carga.id_operacion} FOR UPDATE`;
      const item = await tx.items_reparto.findUnique({
        where: { id_item_reparto: createDto.id_item_reparto },
        include: {
          entregas: true,
          resoluciones_reparto: true,
          guias_operativas: true,
          detalle_carga: {
            include: { operaciones_carga: true, detalle_carga_calidades: true },
          },
        },
      });
      if (!item || Number(item.id_empresa) !== empresaId)
        throw new NotFoundException('Destino de entrega no encontrado.');
      const detalle = item.detalle_carga;
      const operacion = detalle.operaciones_carga;
      if (operacion.estado !== 'repartiendo') throw new BadRequestException('Inicia el reparto antes de registrar una entrega.');
      const recibidas = item.entregas
        .filter((e) => e.estado_entrega !== 'pendiente')
        .reduce((sum, e) => sum + e.cantidad_entregada, 0);
      validarEntrega(
        createDto.cantidad_entregada,
        createDto.cantidad_rechazada ?? 0,
        createDto.estado_entrega,
        item.cantidad_asignada - recibidas - item.resoluciones_reparto.reduce((sum, r) => sum + r.cantidad, 0),
        createDto.nombre_recibe,
      );
      if (
        createDto.estado_entrega === 'pendiente' &&
        item.entregas.some((e) => e.estado_entrega === 'pendiente')
      )
        throw new BadRequestException(
          'Ya existe un registro pendiente para este destino.',
        );
      const hora = this.parseHora(createDto.hora_entrega);
      if (createDto.hora_entrega && !hora)
        throw new BadRequestException('La hora de entrega no es válida.');
      const fecha = new Date(createDto.fecha_entrega);
      if (Number.isNaN(fecha.getTime()) || fecha < operacion.fecha_carga)
        throw new BadRequestException(
          'La fecha de entrega no puede ser anterior a la carga.',
        );
      if (createDto.id_entregador) {
        const usuario = await tx.usuarios.findFirst({
          where: {
            id_usuario: createDto.id_entregador,
            id_empresa: item.id_empresa,
          },
        });
        if (!usuario)
          throw new BadRequestException(
            'El entregador no pertenece a esta empresa.',
          );
      }
      let guia = createDto.id_guia
        ? item.guias_operativas.find(
            (g) => Number(g.id_guia) === createDto.id_guia,
          )
        : item.guias_operativas.find(
            (g) => g.estado !== 'anulada' && g.estado !== 'reemplazada',
          );
      if (createDto.id_guia && !guia)
        throw new BadRequestException(
          'La guía no corresponde a este destino de entrega.',
        );
      if (guia && (guia.estado === 'anulada' || guia.estado === 'reemplazada'))
        throw new BadRequestException('La guía está anulada o reemplazada.');
      if (!guia) throw new BadRequestException('Emite la guía del destino antes de entregar.');
      const cobertura = guia.cobertura as { id_item_reparto?: string; cantidad?: number } | null;
      if (!cobertura || String(cobertura.id_item_reparto) !== String(item.id_item_reparto) || !cobertura.cantidad)
        throw new BadRequestException('La guía no tiene cobertura histórica verificada. Requiere revisión.');
      const recibidoGuia = item.entregas.filter((e) => e.id_guia === guia.id_guia && e.estado_entrega !== 'pendiente').reduce((sum, e) => sum + e.cantidad_entregada, 0);
      if (createDto.cantidad_entregada + (createDto.cantidad_rechazada || 0) > cobertura.cantidad - recibidoGuia)
        throw new BadRequestException('La entrega excede la cobertura pendiente de la guía.');
      const entrega = await tx.entregas.create({
        data: {
          id_empresa: item.id_empresa,
          id_guia: guia.id_guia,
          id_item_reparto: item.id_item_reparto,
          id_entregador: createDto.id_entregador,
          fecha_entrega: fecha,
          hora_entrega: hora,
          cantidad_entregada: createDto.cantidad_entregada,
          cantidad_rechazada: createDto.cantidad_rechazada ?? 0,
          estado_entrega: createDto.estado_entrega,
          firma_recibido: createDto.firma_recibido ?? false,
          nombre_recibe: createDto.nombre_recibe?.trim() || null,
          observaciones: createDto.observaciones,
        },
      });
      // La deuda corresponde a lo recibido en esta entrega, no al total de la carga.
      if (detalle.requiere_retorno_jabas && createDto.cantidad_entregada > 0) {
        const cantidad = createDto.cantidad_entregada;
        await tx.jabas_por_cobrar.create({
          data: {
            id_empresa: item.id_empresa,
            id_entrega: entrega.id_entrega,
            id_tipo_jaba: detalle.id_tipo_jaba,
            fecha_origen: fecha,
            cantidad_original: cantidad,
            cantidad_recuperada: 0,
            saldo_pendiente: cantidad,
            estado: 'pendiente',
            observaciones: 'Generado al registrar la entrega',
          },
        });
      }
      await this.registrarLog(
        tx,
        'entrega_creada',
        'entregas',
        entrega.id_entrega,
        null,
        {
          entrega: String(entrega.id_entrega),
          cantidad: createDto.cantidad_entregada,
        },
        empresaId,
        usuarioId,
      );
      return entrega;
    });
  }

  async findAll(query: QueryEntregasDto) {
    const where: any = {};
    if (query.id_operacion)
      where.items_reparto = {
        detalle_carga: { id_operacion: query.id_operacion },
      };
    if (query.id_guia) where.id_guia = query.id_guia;
    if (query.id_item_reparto) where.id_item_reparto = query.id_item_reparto;
    if (query.estado_entrega) where.estado_entrega = query.estado_entrega;
    if (query.fecha_entrega) {
      const start = new Date(query.fecha_entrega);
      const end = new Date(query.fecha_entrega);
      end.setDate(end.getDate() + 1);
      where.fecha_entrega = { gte: start, lt: end };
    }
    return this.prisma.scoped.entregas.findMany({
      where,
      include: {
        guias_operativas: true,
        items_reparto: true,
        usuarios: true,
      },
      orderBy: { fecha_entrega: 'desc' },
    });
  }

  async findOne(id: number) {
    const entrega = await this.prisma.scoped.entregas.findUnique({
      where: { id_entrega: id },
      include: {
        guias_operativas: true,
        items_reparto: true,
        usuarios: true,
        incidencias: true,
      },
    });
    if (!entrega) throw new NotFoundException(`Entrega ID ${id} no encontrada`);
    return entrega;
  }

  async update(id: number, updateDto: UpdateEntregaDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
    const ref = await tx.entregas.findUnique({ where: { id_entrega: id }, include: { items_reparto: { include: { detalle_carga: true } } } });
    if (!ref) throw new NotFoundException('Entrega no encontrada.');
    await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${ref.items_reparto.detalle_carga.id_operacion} FOR UPDATE`;

    const entrega = await tx.entregas.findUniqueOrThrow({ where: { id_entrega: id }, include: { items_reparto: true } });
    const op = await tx.operaciones_carga.findUniqueOrThrow({ where: { id_operacion: (await tx.detalle_carga.findUniqueOrThrow({ where: { id_detalle_carga: entrega.items_reparto.id_detalle_carga } })).id_operacion } });
    if (op.estado !== 'repartiendo') throw new BadRequestException('La operación no permite editar entregas.');
    const protectedFields = [
      'id_guia',
      'id_item_reparto',
      'cantidad_entregada',
      'cantidad_rechazada',
      'estado_entrega',
    ] as const;
    for (const field of protectedFields) {
      if (
        updateDto[field] !== undefined &&
        String(updateDto[field]) !== String(entrega[field])
      )
        throw new BadRequestException(
          'Las cantidades y el destino ya están registrados. Registra una entrega adicional para el saldo pendiente.',
        );
    }
    if (
      updateDto.nombre_recibe !== undefined &&
      entrega.cantidad_entregada > 0 &&
      !updateDto.nombre_recibe?.trim()
    )
      throw new BadRequestException('Escribe el nombre de quien recibe.');
    return tx.entregas.update({
      where: { id_entrega: id },
      data: {
        nombre_recibe: updateDto.nombre_recibe?.trim(),
        observaciones: updateDto.observaciones,
        firma_recibido: updateDto.firma_recibido,
      },
      include: { guias_operativas: true, items_reparto: true },
    });
    });
  }

  async changeState(id: number, newState: string) {
    const entrega = await this.findOne(id);
    if (entrega.estado_entrega !== newState)
      throw new BadRequestException(
        'El estado depende de las cantidades registradas. Registra una nueva entrega para el saldo pendiente.',
      );
    return entrega;
  }

  async sign(id: number, nombre_recibe?: string) {
    const entrega = await this.findOne(id);
    const nombre = nombre_recibe?.trim() || entrega.nombre_recibe?.trim();
    if (!nombre)
      throw new BadRequestException('Escribe el nombre de quien recibe.');
    if (entrega.cantidad_entregada <= 0)
      throw new BadRequestException('Primero registra las jabas recibidas.');
    return this.update(id, { firma_recibido: true, nombre_recibe: nombre });
  }

  // Endpoints anidados
  async findByGuia(guiaId: number) {
    const guia = await this.prisma.scoped.guias_operativas.findUnique({
      where: { id_guia: guiaId },
    });
    if (!guia) throw new NotFoundException(`Guía ID ${guiaId} no existe`);
    return this.prisma.scoped.entregas.findMany({
      where: { id_guia: guiaId },
      include: { items_reparto: true, usuarios: true },
    });
  }

  async findByItemReparto(itemRepartoId: number) {
    const item = await this.prisma.scoped.items_reparto.findUnique({
      where: { id_item_reparto: itemRepartoId },
    });
    if (!item)
      throw new NotFoundException(`Item reparto ID ${itemRepartoId} no existe`);
    return this.prisma.scoped.entregas.findMany({
      where: { id_item_reparto: itemRepartoId },
      include: { guias_operativas: true, usuarios: true },
    });
  }

  private async validateRelations(dto: any) {
    if (dto.id_guia) {
      const exists = await this.prisma.scoped.guias_operativas.findUnique({
        where: { id_guia: dto.id_guia },
      });
      if (!exists)
        throw new BadRequestException(`Guía ID ${dto.id_guia} no existe`);
    }
    if (dto.id_item_reparto) {
      const exists = await this.prisma.scoped.items_reparto.findUnique({
        where: { id_item_reparto: dto.id_item_reparto },
      });
      if (!exists)
        throw new BadRequestException(
          `Item reparto ID ${dto.id_item_reparto} no existe`,
        );
    }
    if (dto.id_entregador) {
      const exists = await this.prisma.scoped.usuarios.findUnique({
        where: { id_usuario: dto.id_entregador },
      });
      if (!exists)
        throw new BadRequestException(
          `Entregador ID ${dto.id_entregador} no existe`,
        );
    }
  }
}
