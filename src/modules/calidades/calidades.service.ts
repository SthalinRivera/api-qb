import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateCalidadDto } from './dto/create-calidade.dto';
import { UpdateCalidadDto } from './dto/update-calidade.dto';

@Injectable()
export class CalidadesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createCalidadDto: CreateCalidadDto) {
    const empresa = await this.prisma.scoped.empresas.findUnique({
      where: { id_empresa: BigInt(createCalidadDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.scoped.calidades.create({
      data: {
        id_empresa: BigInt(createCalidadDto.id_empresa),
        nombre: createCalidadDto.nombre,
        descripcion: createCalidadDto.descripcion,
        estado: createCalidadDto.estado ?? true,
      },
      include: { empresas: true },
    });
  }

  async findAll(empresaId: number, estado?: boolean) {
    const where: any = {
      id_empresa: BigInt(empresaId),
    };
    if (estado !== undefined) where.estado = estado;
    return this.prisma.scoped.calidades.findMany({
      where,
      include: { empresas: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId?: number) {
    const where: any = { id_calidad: BigInt(id) };
    if (empresaId) where.id_empresa = BigInt(empresaId);

    const calidad = await this.prisma.scoped.calidades.findFirst({
      where,
      include: { empresas: true },
    });
    if (!calidad) throw new NotFoundException(`Calidad con ID ${id} no encontrada`);
    return calidad;
  }

  async update(id: number, updateCalidadDto: UpdateCalidadDto) {
    // Verificar que la calidad pertenece a la empresa
    const existing = await this.prisma.scoped.calidades.findUnique({
      where: { id_calidad: BigInt(id) },
    });
    if (!existing) throw new NotFoundException(`Calidad con ID ${id} no encontrada`);

    if (updateCalidadDto.id_empresa && existing.id_empresa !== BigInt(updateCalidadDto.id_empresa)) {
      throw new ForbiddenException('No tiene permiso para modificar esta calidad');
    }

    try {
      const updated = await this.prisma.scoped.calidades.update({
        where: { id_calidad: BigInt(id) },
        data: {
          nombre: updateCalidadDto.nombre,
          descripcion: updateCalidadDto.descripcion,
          estado: updateCalidadDto.estado,
        },
        include: { empresas: true },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Calidad con ID ${id} no encontrada`);
      throw error;
    }
  }

  async changeState(id: number, estado: boolean, empresaId?: number) {
    // Verificar que la calidad pertenece a la empresa
    if (empresaId) {
      const existing = await this.prisma.scoped.calidades.findFirst({
        where: { id_calidad: BigInt(id), id_empresa: BigInt(empresaId) },
      });
      if (!existing) throw new NotFoundException(`Calidad con ID ${id} no encontrada`);
    }

    return this.update(id, { estado });
  }
}
