import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFrutaDto } from './dto/create-fruta.dto';
import { UpdateFrutaDto } from './dto/update-fruta.dto';

@Injectable()
export class FrutasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFrutaDto: CreateFrutaDto) {
    // Verificar que la empresa existe
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createFrutaDto.id_empresa) }
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.frutas.create({
      data: {
        id_empresa: BigInt(createFrutaDto.id_empresa),
        nombre: createFrutaDto.nombre,
        descripcion: createFrutaDto.descripcion,
        estado: createFrutaDto.estado ?? true,
      },
      include: { empresas: true }
    });
  }

  async findAll() {
    return this.prisma.frutas.findMany({
      where: { estado: true }, // solo activas por defecto
      include: { empresas: true, variedades: true },
      orderBy: { nombre: 'asc' }
    });
  }

  async findOne(id: number) {
    const fruta = await this.prisma.frutas.findUnique({
      where: { id_fruta: BigInt(id) },
      include: { empresas: true, variedades: true }
    });
    if (!fruta) throw new NotFoundException(`Fruta con ID ${id} no encontrada`);
    return fruta;
  }

  async update(id: number, updateFrutaDto: UpdateFrutaDto) {
    try {
      const updated = await this.prisma.frutas.update({
        where: { id_fruta: BigInt(id) },
        data: {
          nombre: updateFrutaDto.nombre,
          descripcion: updateFrutaDto.descripcion,
          estado: updateFrutaDto.estado,
          id_empresa: updateFrutaDto.id_empresa ? BigInt(updateFrutaDto.id_empresa) : undefined,
        },
        include: { empresas: true, variedades: true }
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Fruta con ID ${id} no encontrada`);
      throw error;
    }
  }

  async remove(id: number) {
    // Soft delete: cambiar estado a false
    try {
      const updated = await this.prisma.frutas.update({
        where: { id_fruta: BigInt(id) },
        data: { estado: false }
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Fruta con ID ${id} no encontrada`);
      throw error;
    }
  }
}