import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariedadDto } from './dto/create-variedade.dto';
import { UpdateVariedadDto } from './dto/update-variedade.dto';

@Injectable()
export class VariedadesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createVariedadDto: CreateVariedadDto) {
    // Verificar que la fruta y empresa existen
    const fruta = await this.prisma.frutas.findUnique({
      where: { id_fruta: BigInt(createVariedadDto.id_fruta) }
    });
    if (!fruta) throw new NotFoundException('Fruta no encontrada');

    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createVariedadDto.id_empresa) }
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.variedades.create({
      data: {
        id_empresa: BigInt(createVariedadDto.id_empresa),
        id_fruta: BigInt(createVariedadDto.id_fruta),
        nombre: createVariedadDto.nombre,
        descripcion: createVariedadDto.descripcion,
        estado: createVariedadDto.estado ?? true,
      },
      include: { frutas: true, empresas: true }
    });
  }

  async findAll() {
    return this.prisma.variedades.findMany({
      where: { estado: true },
      include: { frutas: true, empresas: true },
      orderBy: { nombre: 'asc' }
    });
  }

  async findByFruta(frutaId: number) {
    const fruta = await this.prisma.frutas.findUnique({
      where: { id_fruta: BigInt(frutaId) }
    });
    if (!fruta) throw new NotFoundException(`Fruta con ID ${frutaId} no encontrada`);

    return this.prisma.variedades.findMany({
      where: { id_fruta: BigInt(frutaId), estado: true },
      include: { frutas: true, empresas: true },
      orderBy: { nombre: 'asc' }
    });
  }

  async findOne(id: number) {
    const variedad = await this.prisma.variedades.findUnique({
      where: { id_variedad: BigInt(id) },
      include: { frutas: true, empresas: true }
    });
    if (!variedad) throw new NotFoundException(`Variedad con ID ${id} no encontrada`);
    return variedad;
  }

  async update(id: number, updateVariedadDto: UpdateVariedadDto) {
    try {
      const updated = await this.prisma.variedades.update({
        where: { id_variedad: BigInt(id) },
        data: {
          nombre: updateVariedadDto.nombre,
          descripcion: updateVariedadDto.descripcion,
          estado: updateVariedadDto.estado,
          id_empresa: updateVariedadDto.id_empresa ? BigInt(updateVariedadDto.id_empresa) : undefined,
          id_fruta: updateVariedadDto.id_fruta ? BigInt(updateVariedadDto.id_fruta) : undefined,
        },
        include: { frutas: true, empresas: true }
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Variedad con ID ${id} no encontrada`);
      throw error;
    }
  }

  async remove(id: number) {
    // Soft delete
    try {
      const updated = await this.prisma.variedades.update({
        where: { id_variedad: BigInt(id) },
        data: { estado: false }
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Variedad con ID ${id} no encontrada`);
      throw error;
    }
  }
}