import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalidadDto } from './dto/create-calidade.dto';
import { UpdateCalidadDto } from './dto/update-calidade.dto';

@Injectable()
export class CalidadesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createCalidadDto: CreateCalidadDto) {
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createCalidadDto.id_empresa) }
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.calidades.create({
      data: {
        id_empresa: BigInt(createCalidadDto.id_empresa),
        nombre: createCalidadDto.nombre,
        descripcion: createCalidadDto.descripcion,
        estado: createCalidadDto.estado ?? true,
      },
      include: { empresas: true }
    });
  }

  async findAll() {
    return this.prisma.calidades.findMany({
      where: { estado: true },
      include: { empresas: true },
      orderBy: { nombre: 'asc' }
    });
  }

  async findOne(id: number) {
    const calidad = await this.prisma.calidades.findUnique({
      where: { id_calidad: BigInt(id) },
      include: { empresas: true }
    });
    if (!calidad) throw new NotFoundException(`Calidad con ID ${id} no encontrada`);
    return calidad;
  }

  async update(id: number, updateCalidadDto: UpdateCalidadDto) {
    try {
      const updated = await this.prisma.calidades.update({
        where: { id_calidad: BigInt(id) },
        data: {
          nombre: updateCalidadDto.nombre,
          descripcion: updateCalidadDto.descripcion,
          estado: updateCalidadDto.estado,
          id_empresa: updateCalidadDto.id_empresa ? BigInt(updateCalidadDto.id_empresa) : undefined,
        },
        include: { empresas: true }
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Calidad con ID ${id} no encontrada`);
      throw error;
    }
  }

  async remove(id: number) {
    // Soft delete
    try {
      const updated = await this.prisma.calidades.update({
        where: { id_calidad: BigInt(id) },
        data: { estado: false }
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Calidad con ID ${id} no encontrada`);
      throw error;
    }
  }
}