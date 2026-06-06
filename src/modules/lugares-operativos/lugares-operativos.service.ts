// lugares-operativos.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateLugarOperativoDto } from './dto/create-lugar-operativo.dto';
import { UpdateLugarOperativoDto } from './dto/update-lugar-operativo.dto';

@Injectable()
export class LugaresOperativosService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createDto: CreateLugarOperativoDto) {
    // Verificar empresa
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    // Verificar sede
    const sede = await this.prisma.sedes.findFirst({
      where: {
        id_sede: BigInt(createDto.id_sede),
        id_empresa: BigInt(createDto.id_empresa),
      },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada o no pertenece a la empresa');

    return this.prisma.lugares_operativos.create({
      data: {
        id_empresa: BigInt(createDto.id_empresa),
        id_sede: BigInt(createDto.id_sede),
        nombre: createDto.nombre,
        direccion_referencia: createDto.direccion_referencia,
        observaciones: createDto.observaciones,
        estado: createDto.estado ?? true,
        tipo_lugar: createDto.tipo_lugar,
      },
      include: { empresas: true, sedes: true },
    });
  }

  async findAll() {
    return this.prisma.lugares_operativos.findMany({
      where: { estado: true },
      include: { empresas: true, sedes: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const lugar = await this.prisma.lugares_operativos.findUnique({
      where: { id_lugar: BigInt(id) },
      include: { empresas: true, sedes: true },
    });
    if (!lugar) throw new NotFoundException(`Lugar operativo con ID ${id} no encontrado`);
    return lugar;
  }

  async update(id: number, updateDto: UpdateLugarOperativoDto) {
    try {
      const existing = await this.prisma.lugares_operativos.findUnique({
        where: { id_lugar: BigInt(id) },
      });
      if (!existing) throw new NotFoundException(`Lugar operativo con ID ${id} no encontrado`);

      const updated = await this.prisma.lugares_operativos.update({
        where: { id_lugar: BigInt(id) },
        data: {
          id_empresa: updateDto.id_empresa ? BigInt(updateDto.id_empresa) : undefined,
          id_sede: updateDto.id_sede ? BigInt(updateDto.id_sede) : undefined,
          nombre: updateDto.nombre,
          direccion_referencia: updateDto.direccion_referencia,
          observaciones: updateDto.observaciones,
          estado: updateDto.estado,
          tipo_lugar: updateDto.tipo_lugar,
        },
        include: { empresas: true, sedes: true },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Lugar operativo con ID ${id} no encontrado`);
      throw error;
    }
  }

  async remove(id: number) {
    // Soft delete
    try {
      const existing = await this.prisma.lugares_operativos.findUnique({
        where: { id_lugar: BigInt(id) },
      });
      if (!existing) throw new NotFoundException(`Lugar operativo con ID ${id} no encontrado`);

      const updated = await this.prisma.lugares_operativos.update({
        where: { id_lugar: BigInt(id) },
        data: { estado: false },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Lugar operativo con ID ${id} no encontrado`);
      throw error;
    }
  }

  async findBySede(sedeId: number) {
    const sede = await this.prisma.sedes.findUnique({
      where: { id_sede: BigInt(sedeId) },
    });
    if (!sede) throw new NotFoundException(`Sede con ID ${sedeId} no encontrada`);

    return this.prisma.lugares_operativos.findMany({
      where: {
        id_sede: BigInt(sedeId),
        estado: true,
      },
      include: { empresas: true, sedes: true },
      orderBy: { nombre: 'asc' },
    });
  }
}