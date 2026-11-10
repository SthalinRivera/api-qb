import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateVariedadDto } from './dto/create-variedade.dto';
import { UpdateVariedadDto } from './dto/update-variedade.dto';

@Injectable()
export class VariedadesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createVariedadDto: CreateVariedadDto) {
    const fruta = await this.prisma.scoped.frutas.findUnique({
      where: { id_fruta: BigInt(createVariedadDto.id_fruta) },
    });
    if (!fruta) throw new NotFoundException('Fruta no encontrada');

    const empresa = await this.prisma.scoped.empresas.findUnique({
      where: { id_empresa: BigInt(createVariedadDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.scoped.variedades.create({
      data: {
        id_empresa: BigInt(createVariedadDto.id_empresa),
        id_fruta: BigInt(createVariedadDto.id_fruta),
        nombre: createVariedadDto.nombre,
        descripcion: createVariedadDto.descripcion,
        estado: createVariedadDto.estado ?? true,
      },
      include: { frutas: true, empresas: true },
    });
  }

  async findAll(estado?: boolean) {
    const where: any = {};
    if (estado !== undefined) where.estado = estado;
    return this.prisma.scoped.variedades.findMany({
      where,
      include: { frutas: true, empresas: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findByFruta(frutaId: number, estado?: boolean) {
    const fruta = await this.prisma.scoped.frutas.findUnique({
      where: { id_fruta: BigInt(frutaId) },
    });
    if (!fruta) throw new NotFoundException(`Fruta con ID ${frutaId} no encontrada`);

    const where: any = { id_fruta: BigInt(frutaId) };
    if (estado !== undefined) where.estado = estado;
    return this.prisma.scoped.variedades.findMany({
      where,
      include: { frutas: true, empresas: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const variedad = await this.prisma.scoped.variedades.findUnique({
      where: { id_variedad: BigInt(id) },
      include: { frutas: true, empresas: true },
    });
    if (!variedad) throw new NotFoundException(`Variedad con ID ${id} no encontrada`);
    return variedad;
  }

  async update(id: number, updateVariedadDto: UpdateVariedadDto) {
    try {
      const updated = await this.prisma.scoped.variedades.update({
        where: { id_variedad: BigInt(id) },
        data: {
          nombre: updateVariedadDto.nombre,
          descripcion: updateVariedadDto.descripcion,
          estado: updateVariedadDto.estado,
          id_empresa: updateVariedadDto.id_empresa ? BigInt(updateVariedadDto.id_empresa) : undefined,
          id_fruta: updateVariedadDto.id_fruta ? BigInt(updateVariedadDto.id_fruta) : undefined,
        },
        include: { frutas: true, empresas: true },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Variedad con ID ${id} no encontrada`);
      throw error;
    }
  }

  async changeState(id: number, estado: boolean) {
    return this.update(id, { estado });
  }
}