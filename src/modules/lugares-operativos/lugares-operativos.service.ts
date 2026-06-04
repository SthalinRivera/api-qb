import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateLugarOperativoDto } from './dto/create-lugar-operativo.dto';
import { UpdateLugarOperativoDto } from './dto/update-lugar-operativo.dto';

@Injectable()
export class LugarOperativoService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createLugarOperativoDto: CreateLugarOperativoDto) {
    // Verificar empresa
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createLugarOperativoDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    // Verificar sede
    const sede = await this.prisma.sedes.findFirst({
      where: {
        id_sede: BigInt(createLugarOperativoDto.id_sede),
        id_empresa: BigInt(createLugarOperativoDto.id_empresa),
      },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada o no pertenece a la empresa');

    return this.prisma.lugares_operativos.create({
      data: {
        id_empresa: BigInt(createLugarOperativoDto.id_empresa),
        id_sede: BigInt(createLugarOperativoDto.id_sede),
        nombre: createLugarOperativoDto.nombre,
        direccion_referencia: createLugarOperativoDto.direccion_referencia,
        observaciones: createLugarOperativoDto.observaciones,
        estado: createLugarOperativoDto.estado ?? true,
        tipo_lugar: createLugarOperativoDto.tipo_lugar,
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
    const mercado = await this.prisma.lugares_operativos.findUnique({
      where: { id_lugar: BigInt(id) },
      include: { empresas: true, sedes: true },
    });
    if (!mercado) throw new NotFoundException(`Mercado con ID ${id} no encontrado`);
    if (mercado.tipo_lugar !== 'mercado')
      throw new NotFoundException(`El registro con ID ${id} no es un mercado`);
    return mercado;
  }

  async update(id: number, updateLugarOperativoDto: UpdateLugarOperativoDto) {
    try {
      const existing = await this.prisma.lugares_operativos.findUnique({
        where: { id_lugar: BigInt(id) },
      });
      if (!existing) throw new NotFoundException(`Lugar operativo con ID ${id} no encontrado`);

      // Eliminamos la condición que filtraba por 'mercado'
      const updated = await this.prisma.lugares_operativos.update({
        where: { id_lugar: BigInt(id) },
        data: {
          id_empresa: updateLugarOperativoDto.id_empresa ? BigInt(updateLugarOperativoDto.id_empresa) : undefined,
          id_sede: updateLugarOperativoDto.id_sede ? BigInt(updateLugarOperativoDto.id_sede) : undefined,
          nombre: updateLugarOperativoDto.nombre,
          direccion_referencia: updateLugarOperativoDto.direccion_referencia,
          observaciones: updateLugarOperativoDto.observaciones,
          estado: updateLugarOperativoDto.estado,
          tipo_lugar: updateLugarOperativoDto.tipo_lugar,
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
      if (!existing) throw new NotFoundException(`Mercado con ID ${id} no encontrado`);
      if (existing.tipo_lugar !== 'mercado')
        throw new NotFoundException(`El registro con ID ${id} no es un mercado`);

      const updated = await this.prisma.lugares_operativos.update({
        where: { id_lugar: BigInt(id) },
        data: { estado: false },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Mercado con ID ${id} no encontrado`);
      throw error;
    }
  }

  async findBySede(sedeId: number) {
    // Verificar que la sede existe
    const sede = await this.prisma.sedes.findUnique({
      where: { id_sede: BigInt(sedeId) },
    });
    if (!sede) throw new NotFoundException(`Sede con ID ${sedeId} no encontrada`);

    return this.prisma.lugares_operativos.findMany({
      where: {
        id_sede: BigInt(sedeId),
        tipo_lugar: 'mercado',
        estado: true,
      },
      include: { empresas: true, sedes: true },
      orderBy: { nombre: 'asc' },
    });
  }
}