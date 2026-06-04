import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateMercadoDto } from './dto/create-mercado.dto';
import { UpdateMercadoDto } from './dto/update-mercado.dto';

@Injectable()
export class MercadosService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createMercadoDto: CreateMercadoDto) {
    // Verificar empresa
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createMercadoDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    // Verificar sede
    const sede = await this.prisma.sedes.findFirst({
      where: {
        id_sede: BigInt(createMercadoDto.id_sede),
        id_empresa: BigInt(createMercadoDto.id_empresa),
      },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada o no pertenece a la empresa');

    return this.prisma.lugares_operativos.create({
      data: {
        id_empresa: BigInt(createMercadoDto.id_empresa),
        id_sede: BigInt(createMercadoDto.id_sede),
        nombre: createMercadoDto.nombre,
        direccion_referencia: createMercadoDto.direccion_referencia,
        observaciones: createMercadoDto.observaciones,
        estado: createMercadoDto.estado ?? true,
        tipo_lugar: 'mercado', // forzamos el tipo
      },
      include: { empresas: true, sedes: true },
    });
  }

  async findAll() {
    return this.prisma.lugares_operativos.findMany({
      where: { tipo_lugar: 'mercado', estado: true },
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

  async update(id: number, updateMercadoDto: UpdateMercadoDto) {
    try {
      // Primero verificamos que exista y sea mercado
      const existing = await this.prisma.lugares_operativos.findUnique({
        where: { id_lugar: BigInt(id) },
      });
      if (!existing) throw new NotFoundException(`Mercado con ID ${id} no encontrado`);
      if (existing.tipo_lugar !== 'mercado')
        throw new NotFoundException(`El registro con ID ${id} no es un mercado`);

      const updated = await this.prisma.lugares_operativos.update({
        where: { id_lugar: BigInt(id) },
        data: {
          id_empresa: updateMercadoDto.id_empresa ? BigInt(updateMercadoDto.id_empresa) : undefined,
          id_sede: updateMercadoDto.id_sede ? BigInt(updateMercadoDto.id_sede) : undefined,
          nombre: updateMercadoDto.nombre,
          direccion_referencia: updateMercadoDto.direccion_referencia,
          observaciones: updateMercadoDto.observaciones,
          estado: updateMercadoDto.estado,
        },
        include: { empresas: true, sedes: true },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Mercado con ID ${id} no encontrado`);
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