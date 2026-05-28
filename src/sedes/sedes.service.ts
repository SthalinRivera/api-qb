import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

@Injectable()
export class SedesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSedeDto: CreateSedeDto) {
    // Verificar que la empresa existe
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createSedeDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    // Verificar que no exista otra sede con el mismo nombre para la misma empresa (unique en base de datos)
    // La base de datos ya tiene unique constraint (id_empresa, nombre), por lo que Prisma lanzará error P2002 si se duplica.
    return this.prisma.sedes.create({
      data: {
        id_empresa: BigInt(createSedeDto.id_empresa),
        nombre: createSedeDto.nombre,
        tipo_sede: createSedeDto.tipo_sede,
        direccion: createSedeDto.direccion,
        ciudad: createSedeDto.ciudad,
        departamento: createSedeDto.departamento,
        estado: createSedeDto.estado ?? true,
      },
      include: { empresas: true },
    });
  }

  async findAll(tipo?: string) {
    const where: any = {};
    if (tipo) {
      // Filtrar por tipo_sede (origen, destino, ambos)
      where.tipo_sede = tipo;
    }
    return this.prisma.sedes.findMany({
      where,
      include: { empresas: true },
      orderBy: { id_sede: 'asc' },
    });
  }

  async findOne(id: number) {
    const sede = await this.prisma.sedes.findUnique({
      where: { id_sede: BigInt(id) },
      include: { empresas: true },
    });
    if (!sede) throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    return sede;
  }

  async update(id: number, updateSedeDto: UpdateSedeDto) {
    try {
      const updated = await this.prisma.sedes.update({
        where: { id_sede: BigInt(id) },
        data: {
          id_empresa: updateSedeDto.id_empresa ? BigInt(updateSedeDto.id_empresa) : undefined,
          nombre: updateSedeDto.nombre,
          tipo_sede: updateSedeDto.tipo_sede,
          direccion: updateSedeDto.direccion,
          ciudad: updateSedeDto.ciudad,
          departamento: updateSedeDto.departamento,
          estado: updateSedeDto.estado,
        },
        include: { empresas: true },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Sede con ID ${id} no encontrada`);
      throw error;
    }
  }

  async remove(id: number) {
    // Soft delete: cambiar estado a false
    try {
      const updated = await this.prisma.sedes.update({
        where: { id_sede: BigInt(id) },
        data: { estado: false },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Sede con ID ${id} no encontrada`);
      throw error;
    }
  }
}