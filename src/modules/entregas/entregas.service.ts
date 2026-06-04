import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateEntregaDto } from './dto/create-entregas.dto';
import { UpdateEntregaDto } from './dto/update-entregas.dto';
import { QueryEntregasDto } from './dto/query-entregas.dto';

@Injectable()
export class EntregasService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateEntregaDto) {
    await this.validateRelations(createDto);
    return this.prisma.entregas.create({
      data: {
        id_empresa: 1,
        id_guia: createDto.id_guia,
        id_item_reparto: createDto.id_item_reparto,
        id_entregador: createDto.id_entregador,
        fecha_entrega: new Date(createDto.fecha_entrega),
        hora_entrega: createDto.hora_entrega ? new Date(`1970-01-01T${createDto.hora_entrega}`) : null,
        cantidad_entregada: createDto.cantidad_entregada,
        cantidad_rechazada: createDto.cantidad_rechazada ?? 0,
        estado_entrega: createDto.estado_entrega,
        firma_recibido: createDto.firma_recibido ?? false,
        nombre_recibe: createDto.nombre_recibe,
        observaciones: createDto.observaciones,
      },
      include: {
        guias_operativas: true,
        items_reparto: true,
        usuarios: true,
      },
    });
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
    if (updateDto.hora_entrega) data.hora_entrega = new Date(`1970-01-01T${updateDto.hora_entrega}`);
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