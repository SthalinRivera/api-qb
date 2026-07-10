import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateLugarOperativoDto } from './dto/create-lugar-operativo.dto';
import { UpdateLugarOperativoDto } from './dto/update-lugar-operativo.dto';

@Injectable()
export class LugaresOperativosService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createDto: CreateLugarOperativoDto) {
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

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

  async findAll(empresaId: number, estado?: boolean) {
    const where: any = { id_empresa: BigInt(empresaId) };
    if (estado !== undefined) where.estado = estado;
    return this.prisma.lugares_operativos.findMany({
      where,
      include: { empresas: true, sedes: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId?: number) {
    const where: any = { id_lugar: BigInt(id) };
    if (empresaId) where.id_empresa = BigInt(empresaId);

    const lugar = await this.prisma.lugares_operativos.findFirst({
      where,
      include: { empresas: true, sedes: true },
    });
    if (!lugar) throw new NotFoundException(`Lugar operativo con ID ${id} no encontrado`);
    return lugar;
  }

  async update(id: number, updateDto: UpdateLugarOperativoDto) {
    const existing = await this.prisma.lugares_operativos.findUnique({
      where: { id_lugar: BigInt(id) },
    });
    if (!existing) throw new NotFoundException(`Lugar operativo con ID ${id} no encontrado`);

    if (updateDto.id_empresa && existing.id_empresa !== BigInt(updateDto.id_empresa)) {
      throw new ForbiddenException('No tiene permiso para modificar este registro');
    }

    try {
      const updated = await this.prisma.lugares_operativos.update({
        where: { id_lugar: BigInt(id) },
        data: {
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

  async changeState(id: number, estado: boolean, empresaId?: number) {
    if (empresaId) {
      const existing = await this.prisma.lugares_operativos.findFirst({
        where: { id_lugar: BigInt(id), id_empresa: BigInt(empresaId) },
      });
      if (!existing) throw new NotFoundException(`Lugar operativo con ID ${id} no encontrado`);
    }
    return this.update(id, { estado });
  }

  async findBySede(sedeId: number, estado?: boolean) {
    const sede = await this.prisma.sedes.findUnique({
      where: { id_sede: BigInt(sedeId) },
    });
    if (!sede) throw new NotFoundException(`Sede con ID ${sedeId} no encontrada`);

    const where: any = { id_sede: BigInt(sedeId) };
    if (estado !== undefined) where.estado = estado;
    return this.prisma.lugares_operativos.findMany({
      where,
      include: { empresas: true, sedes: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
