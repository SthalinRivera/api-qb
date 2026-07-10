import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
  constructor(private prisma: PrismaService) { }

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
  async create(createDto: EntregaCreateDto, empresaId: number = 1, usuarioId?: number) {
    await this.validateRelations(createDto);
    const horaDate = this.parseHora(createDto.hora_entrega);

    const entrega = await this.prisma.$transaction(async (tx) => {
      const entregaCreada = await tx.entregas.create({
        data: {
          id_empresa: 1,
          id_guia: createDto.id_guia,
          id_item_reparto: createDto.id_item_reparto,
          id_entregador: createDto.id_entregador,
          fecha_entrega: new Date(createDto.fecha_entrega),
          hora_entrega: horaDate,
          cantidad_entregada: createDto.cantidad_entregada,
          cantidad_rechazada: createDto.cantidad_rechazada ?? 0,
          estado_entrega: createDto.estado_entrega,
          firma_recibido: createDto.firma_recibido ?? false,
          nombre_recibe: createDto.nombre_recibe,
          observaciones: createDto.observaciones,
        },
        include: {
          guias_operativas: {
            include: {
              items_reparto: {
                include: {
                  detalle_carga: {
                    select: { id_operacion: true, id_cliente_emisor: true, id_tipo_jaba: true, cantidad_jabas: true, requiere_retorno_jabas: true }
                  }
                }
              }
            }
          }
        }
      });

      const detalle = entregaCreada.guias_operativas?.items_reparto?.detalle_carga;
      const requiereRetorno = Boolean(createDto.requiere_retorno_jabas ?? detalle?.requiere_retorno_jabas);

      if (requiereRetorno) {
        const cantidadJabas = createDto.cantidad_jabas ?? detalle?.cantidad_jabas ?? 0;
        const idClienteEmisor = createDto.id_cliente_emisor ?? detalle?.id_cliente_emisor;
        const idTipoJaba = createDto.id_tipo_jaba ?? detalle?.id_tipo_jaba;

        if (cantidadJabas > 0 && idClienteEmisor && idTipoJaba) {
          const jabaPagar = await tx.jabas_por_pagar.create({
            data: {
              id_empresa: 1,
              id_entrega: entregaCreada.id_entrega,
              id_cliente_emisor: idClienteEmisor,
              id_tipo_jaba: idTipoJaba,
              fecha_origen: new Date(createDto.fecha_entrega),
              cantidad_original: cantidadJabas,
              cantidad_pagada: 0,
              saldo_pendiente: cantidadJabas,
              estado: 'pendiente',
              observaciones: 'Generado automáticamente al crear la entrega',
            },
          });

          const jabaCobrar = await tx.jabas_por_cobrar.create({
            data: {
              id_empresa: 1,
              id_entrega: entregaCreada.id_entrega,
              id_tipo_jaba: idTipoJaba,
              fecha_origen: new Date(createDto.fecha_entrega),
              cantidad_original: cantidadJabas,
              cantidad_recuperada: 0,
              saldo_pendiente: cantidadJabas,
              estado: 'pendiente',
              observaciones: 'Generado automáticamente al crear la entrega',
            },
          });

          await this.registrarLog(
            tx,
            'entrega_con_retorno_creada',
            'entregas',
            entregaCreada.id_entrega,
            null,
            {
              entrega: entregaCreada.id_entrega,
              jaba_por_pagar: jabaPagar.id_jaba_pagar,
              jaba_por_cobrar: jabaCobrar.id_jaba_cobrar,
              cantidad_original: cantidadJabas,
            },
            empresaId,
            usuarioId,
          );
        }
      }

      await this.registrarLog(
        tx,
        'entrega_creada',
        'entregas',
        entregaCreada.id_entrega,
        null,
        {
          entrega: entregaCreada.id_entrega,
          requiere_retorno_jabas: requiereRetorno,
        },
        empresaId,
        usuarioId,
      );

      return entregaCreada;
    });

    const operacionId = entrega.guias_operativas?.items_reparto?.detalle_carga?.id_operacion;

    if (operacionId) {
      // Verificar si todas las guías de la operación están firmadas
      const guiasOperacion = await this.prisma.guias_operativas.findMany({
        where: {
          items_reparto: {
            detalle_carga: { id_operacion: operacionId }
          }
        },
        select: { estado: true }
      });

      const todasFirmadas = guiasOperacion.length > 0 && guiasOperacion.every(g => g.estado === 'firmada');
      if (todasFirmadas) {
        await this.prisma.operaciones_carga.update({
          where: { id_operacion: operacionId },
          data: { estado: 'completado' }
        });
      }
    }

    return entrega;
  }

  async findAll(query: QueryEntregasDto) {
    const where: any = {};
    if (query.id_guia) where.id_guia = query.id_guia;
    if (query.id_item_reparto) where.id_item_reparto = query.id_item_reparto;
    if (query.estado_entrega) where.estado_entrega = query.estado_entrega;
    if (query.fecha_entrega) {
      const start = new Date(query.fecha_entrega);
      const end = new Date(query.fecha_entrega);
      end.setDate(end.getDate() + 1);
      where.fecha_entrega = { gte: start, lt: end };
    }
    return this.prisma.entregas.findMany({
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
    const entrega = await this.prisma.entregas.findUnique({
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
    await this.findOne(id);
    if (Object.keys(updateDto).length === 0)
      throw new BadRequestException('No se enviaron datos para actualizar');
    await this.validateRelations(updateDto);
    const data: any = { ...updateDto };
    if (updateDto.fecha_entrega) data.fecha_entrega = new Date(updateDto.fecha_entrega);
    if (updateDto.hora_entrega) {
      data.hora_entrega = this.parseHora(updateDto.hora_entrega);
    }
    return this.prisma.entregas.update({
      where: { id_entrega: id },
      data,
      include: { guias_operativas: true, items_reparto: true },
    });
  }

  async changeState(id: number, newState: string) {
    const allowed = ['pendiente', 'entregado_parcial', 'entregado_total', 'rechazado', 'observado'];
    if (!allowed.includes(newState))
      throw new BadRequestException(`Estado de entrega no válido: ${newState}`);
    await this.findOne(id);
    return this.prisma.entregas.update({
      where: { id_entrega: id },
      data: { estado_entrega: newState },
    });
  }

  async sign(id: number, nombre_recibe?: string) {
    await this.findOne(id);
    return this.prisma.entregas.update({
      where: { id_entrega: id },
      data: {
        firma_recibido: true,
        nombre_recibe: nombre_recibe ?? null,
        estado_entrega: 'entregado_total',
      },
    });
  }

  // Endpoints anidados
  async findByGuia(guiaId: number) {
    const guia = await this.prisma.guias_operativas.findUnique({
      where: { id_guia: guiaId },
    });
    if (!guia) throw new NotFoundException(`Guía ID ${guiaId} no existe`);
    return this.prisma.entregas.findMany({
      where: { id_guia: guiaId },
      include: { items_reparto: true, usuarios: true },
    });
  }

  async findByItemReparto(itemRepartoId: number) {
    const item = await this.prisma.items_reparto.findUnique({
      where: { id_item_reparto: itemRepartoId },
    });
    if (!item) throw new NotFoundException(`Item reparto ID ${itemRepartoId} no existe`);
    return this.prisma.entregas.findMany({
      where: { id_item_reparto: itemRepartoId },
      include: { guias_operativas: true, usuarios: true },
    });
  }

  private async validateRelations(dto: any) {
    if (dto.id_guia) {
      const exists = await this.prisma.guias_operativas.findUnique({
        where: { id_guia: dto.id_guia },
      });
      if (!exists) throw new BadRequestException(`Guía ID ${dto.id_guia} no existe`);
    }
    if (dto.id_item_reparto) {
      const exists = await this.prisma.items_reparto.findUnique({
        where: { id_item_reparto: dto.id_item_reparto },
      });
      if (!exists) throw new BadRequestException(`Item reparto ID ${dto.id_item_reparto} no existe`);
    }
    if (dto.id_entregador) {
      const exists = await this.prisma.usuarios.findUnique({
        where: { id_usuario: dto.id_entregador },
      });
      if (!exists) throw new BadRequestException(`Entregador ID ${dto.id_entregador} no existe`);
    }
  }
}