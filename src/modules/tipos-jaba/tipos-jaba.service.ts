import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateTipoJabaDto } from './dto/create-tipos-jaba.dto';
import { UpdateTipoJabaDto } from './dto/update-tipos-jaba.dto';

@Injectable()
export class TiposJabaService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createTipoJabaDto: CreateTipoJabaDto) {
    const empresa = await this.prisma.scoped.empresas.findUnique({
      where: { id_empresa: BigInt(createTipoJabaDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.scoped.tipos_jaba.create({
      data: {
        id_empresa: BigInt(createTipoJabaDto.id_empresa),
        nombre: createTipoJabaDto.nombre,
        tipo_material: createTipoJabaDto.tipo_material,
        descripcion: createTipoJabaDto.descripcion,
        estado: createTipoJabaDto.estado ?? true,
      },
      include: { empresas: true },
    });
  }

  async findAll(empresaId: number, estado?: boolean) {
    const where: any = { id_empresa: BigInt(empresaId) };
    if (estado !== undefined) where.estado = estado;
    return this.prisma.scoped.tipos_jaba.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId?: number) {
    const where: any = { id_tipo_jaba: BigInt(id) };
    if (empresaId) where.id_empresa = BigInt(empresaId);

    const tipo = await this.prisma.scoped.tipos_jaba.findFirst({
      where,
      include: { empresas: true },
    });
    if (!tipo) throw new NotFoundException(`Tipo de jaba con ID ${id} no encontrado`);
    return tipo;
  }

  async update(id: number, updateTipoJabaDto: UpdateTipoJabaDto) {
    const existing = await this.prisma.scoped.tipos_jaba.findUnique({
      where: { id_tipo_jaba: BigInt(id) },
    });
    if (!existing) throw new NotFoundException(`Tipo de jaba con ID ${id} no encontrado`);

    if (updateTipoJabaDto.id_empresa && existing.id_empresa !== BigInt(updateTipoJabaDto.id_empresa)) {
      throw new ForbiddenException('No tiene permiso para modificar este registro');
    }

    try {
      const updated = await this.prisma.scoped.tipos_jaba.update({
        where: { id_tipo_jaba: BigInt(id) },
        data: {
          nombre: updateTipoJabaDto.nombre,
          tipo_material: updateTipoJabaDto.tipo_material,
          descripcion: updateTipoJabaDto.descripcion,
          estado: updateTipoJabaDto.estado,
        },
        include: { empresas: true },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Tipo de jaba con ID ${id} no encontrado`);
      throw error;
    }
  }

  async changeState(id: number, estado: boolean, empresaId?: number) {
    if (empresaId) {
      const existing = await this.prisma.scoped.tipos_jaba.findFirst({
        where: { id_tipo_jaba: BigInt(id), id_empresa: BigInt(empresaId) },
      });
      if (!existing) throw new NotFoundException(`Tipo de jaba con ID ${id} no encontrado`);
    }
    return this.update(id, { estado });
  }
}
