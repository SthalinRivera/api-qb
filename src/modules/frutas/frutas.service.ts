import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateFrutaDto } from './dto/create-fruta.dto';
import { UpdateFrutaDto } from './dto/update-fruta.dto';

@Injectable()
export class FrutasService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createFrutaDto: CreateFrutaDto) {
    const empresa = await this.prisma.scoped.empresas.findUnique({
      where: { id_empresa: BigInt(createFrutaDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.scoped.frutas.create({
      data: {
        id_empresa: BigInt(createFrutaDto.id_empresa),
        nombre: createFrutaDto.nombre,
        descripcion: createFrutaDto.descripcion,
        estado: createFrutaDto.estado ?? true,
      },
      include: { empresas: true, variedades: true },
    });
  }

  async findAll(estado?: boolean) {
    const where: any = {};
    if (estado !== undefined) where.estado = estado;
    return this.prisma.scoped.frutas.findMany({
      where,
      include: { empresas: true, variedades: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const fruta = await this.prisma.scoped.frutas.findUnique({
      where: { id_fruta: BigInt(id) },
      include: { empresas: true, variedades: true },
    });
    if (!fruta) throw new NotFoundException(`Fruta con ID ${id} no encontrada`);
    return fruta;
  }

  async update(id: number, updateFrutaDto: UpdateFrutaDto) {
    try {
      const updated = await this.prisma.scoped.frutas.update({
        where: { id_fruta: BigInt(id) },
        data: {
          nombre: updateFrutaDto.nombre,
          descripcion: updateFrutaDto.descripcion,
          estado: updateFrutaDto.estado,
          id_empresa: updateFrutaDto.id_empresa ? BigInt(updateFrutaDto.id_empresa) : undefined,
        },
        include: { empresas: true, variedades: true },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Fruta con ID ${id} no encontrada`);
      throw error;
    }
  }

  async changeState(id: number, estado: boolean) {
    return this.update(id, { estado });
  }
}