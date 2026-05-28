import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeccionDto } from './dto/create-puesto-seccione.dto';
import { UpdateSeccionDto } from './dto/update-puesto-seccione.dto';

@Injectable()
export class PuestoSeccionesService {
  constructor(private readonly prisma: PrismaService) { }
  async findAll() {
    return this.prisma.puesto_secciones.findMany({
      where: { estado: true },
      include: { puestos: true },
      orderBy: { nombre_seccion: 'asc' },
    });
  }

  async create(createSeccionDto: CreateSeccionDto) {
    // Verificar que el puesto existe
    const puesto = await this.prisma.puestos.findUnique({
      where: { id_puesto: BigInt(createSeccionDto.id_puesto) },
      include: { empresas: true },
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');

    return this.prisma.puesto_secciones.create({
      data: {
        id_puesto: BigInt(createSeccionDto.id_puesto),
        id_empresa: puesto.id_empresa, // hereda la empresa del puesto
        nombre_seccion: createSeccionDto.nombre_seccion,
        descripcion: createSeccionDto.descripcion,
        observaciones: createSeccionDto.observaciones,
        estado: createSeccionDto.estado ?? true,
      },
      include: { puestos: true },
    });
  }

  async findAllByPuesto(puestoId: number) {
    // Verificar que el puesto existe
    const puesto = await this.prisma.puestos.findUnique({
      where: { id_puesto: BigInt(puestoId) },
    });
    if (!puesto) throw new NotFoundException(`Puesto con ID ${puestoId} no encontrado`);

    return this.prisma.puesto_secciones.findMany({
      where: { id_puesto: BigInt(puestoId), estado: true },
      include: { puestos: true },
      orderBy: { nombre_seccion: 'asc' },
    });
  }

  async findOne(id: number) {
    const seccion = await this.prisma.puesto_secciones.findUnique({
      where: { id_seccion: BigInt(id) },
      include: { puestos: true },
    });
    if (!seccion) throw new NotFoundException(`Sección con ID ${id} no encontrada`);
    return seccion;
  }

  async update(id: number, updateSeccionDto: UpdateSeccionDto) {
    try {
      const existing = await this.prisma.puesto_secciones.findUnique({
        where: { id_seccion: BigInt(id) },
      });
      if (!existing) throw new NotFoundException(`Sección con ID ${id} no encontrada`);

      // Si se actualiza el puesto, verificar que existe
      if (updateSeccionDto.id_puesto) {
        const puesto = await this.prisma.puestos.findUnique({
          where: { id_puesto: BigInt(updateSeccionDto.id_puesto) },
        });
        if (!puesto) throw new NotFoundException('Puesto no encontrado');
      }

      const updated = await this.prisma.puesto_secciones.update({
        where: { id_seccion: BigInt(id) },
        data: {
          id_puesto: updateSeccionDto.id_puesto ? BigInt(updateSeccionDto.id_puesto) : undefined,
          nombre_seccion: updateSeccionDto.nombre_seccion,
          descripcion: updateSeccionDto.descripcion,
          observaciones: updateSeccionDto.observaciones,
          estado: updateSeccionDto.estado,
        },
        include: { puestos: true },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Sección con ID ${id} no encontrada`);
      throw error;
    }
  }

  async remove(id: number) {
    // Soft delete
    try {
      const updated = await this.prisma.puesto_secciones.update({
        where: { id_seccion: BigInt(id) },
        data: { estado: false },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Sección con ID ${id} no encontrada`);
      throw error;
    }
  }
}