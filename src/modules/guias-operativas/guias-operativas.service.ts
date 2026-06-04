import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateGuiaOperativaDto } from './dto/create-guias-operativa.dto';
import { UpdateGuiaOperativaDto } from './dto/update-guias-operativa.dto';
import { QueryGuiasOperativasDto } from './dto/query-guias-operativas.dto';
// Elimina importaciones de CreateGuiaDetalleDto, UpdateGuiaDetalleDto

@Injectable()
export class GuiasOperativasService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateGuiaOperativaDto) {
    await this.validateRelations(createDto);
    const existing = await this.prisma.guias_operativas.findFirst({
      where: { id_empresa: 1, numero_guia: createDto.numero_guia },
    });
    if (existing) throw new BadRequestException('El número de guía ya existe para esta empresa');

    return this.prisma.guias_operativas.create({
      data: {
        id_empresa: 1,
        numero_guia: createDto.numero_guia,
        fecha_emision: new Date(createDto.fecha_emision),
        id_repartidor: createDto.id_repartidor,
        estado: createDto.estado ?? 'emitida',
        observaciones: createDto.observaciones,
        id_item_reparto: createDto.id_item_reparto,
      },
      include: { usuarios: true, items_reparto: true },
    });
  }

  async findAll(query: QueryGuiasOperativasDto) {
    const where: any = {};
    if (query.estado) where.estado = query.estado;
    if (query.id_repartidor) where.id_repartidor = query.id_repartidor;
    if (query.fecha_emision) {
      const start = new Date(query.fecha_emision);
      const end = new Date(query.fecha_emision);
      end.setDate(end.getDate() + 1);
      where.fecha_emision = { gte: start, lt: end };
    }
    return this.prisma.guias_operativas.findMany({
      where,
      include: { usuarios: true, items_reparto: true },
      orderBy: { fecha_emision: 'desc' },
    });
  }

  async findOne(id: number) {
    const guia = await this.prisma.guias_operativas.findUnique({
      where: { id_guia: id },
      include: {
        usuarios: true,
        items_reparto: true,
        entregas: true,
        // guia_operativa_detalle NO existe
      },
    });
    if (!guia) throw new NotFoundException(`Guía operativa ID ${id} no encontrada`);
    return guia;
  }

  async update(id: number, updateDto: UpdateGuiaOperativaDto) {
    await this.findOne(id);
    if (Object.keys(updateDto).length === 0)
      throw new BadRequestException('No se enviaron datos para actualizar');
    await this.validateRelations(updateDto);
    const data: any = { ...updateDto };
    if (updateDto.fecha_emision) data.fecha_emision = new Date(updateDto.fecha_emision);
    return this.prisma.guias_operativas.update({
      where: { id_guia: id },
      data,
      include: { usuarios: true, items_reparto: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.guias_operativas.update({
      where: { id_guia: id },
      data: { estado: 'anulada' },
    });
  }

  async sign(id: number) {
    await this.findOne(id);
    return this.prisma.guias_operativas.update({
      where: { id_guia: id },
      data: { estado: 'firmada' },
    });
  }

  async changeState(id: number, newState: string) {
    const allowed = ['emitida', 'firmada', 'anulada', 'reemplazada', 'observada'];
    if (!allowed.includes(newState))
      throw new BadRequestException(`Estado no válido: ${newState}`);
    await this.findOne(id);
    return this.prisma.guias_operativas.update({
      where: { id_guia: id },
      data: { estado: newState },
    });
  }

  private async validateRelations(dto: any) {
    if (dto.id_repartidor) {
      const exists = await this.prisma.usuarios.findUnique({
        where: { id_usuario: dto.id_repartidor },
      });
      if (!exists) throw new BadRequestException(`Repartidor ID ${dto.id_repartidor} no existe`);
    }
    if (dto.id_item_reparto) {
      const exists = await this.prisma.items_reparto.findUnique({
        where: { id_item_reparto: dto.id_item_reparto },
      });
      if (!exists) throw new BadRequestException(`Item reparto ID ${dto.id_item_reparto} no existe`);
    }
  }
}