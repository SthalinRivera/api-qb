import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

@Injectable()
export class SedesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createSedeDto: CreateSedeDto) {
    const empresa = await this.prisma.scoped.empresas.findUnique({
      where: { id_empresa: BigInt(createSedeDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.scoped.sedes.create({
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
    if (tipo) where.tipo_sede = tipo;
    return this.prisma.scoped.sedes.findMany({
      where,
      include: { empresas: true },
      orderBy: { id_sede: 'asc' },
    });
  }

  async findOne(id: number) {
    const sede = await this.prisma.scoped.sedes.findUnique({
      where: { id_sede: BigInt(id) },
      include: { empresas: true },
    });
    if (!sede) throw new NotFoundException(`Sede con ID ${id} no encontrada`);
    return sede;
  }

  async update(id: number, updateSedeDto: UpdateSedeDto) {
    try {
      const updated = await this.prisma.scoped.sedes.update({
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
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Sede con ID ${id} no encontrada`);
      throw error;
    }
  }

  async changeState(id: number, estado: boolean) {
    return this.update(id, { estado });
  }
}