import { QueryPuestosDto } from './dto/query-puestos.dto';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreatePuestoDto } from './dto/create-puesto.dto';
import { UpdatePuestoDto } from './dto/update-puesto.dto';

@Injectable()
export class PuestosService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createPuestoDto: CreatePuestoDto) {
    const empresa = await this.prisma.scoped.empresas.findUnique({
      where: { id_empresa: BigInt(createPuestoDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    const mercado = await this.prisma.scoped.lugares_operativos.findFirst({
      where: {
        id_lugar: BigInt(createPuestoDto.id_lugar),
        tipo_lugar: 'mercado',
      },
    });
    if (!mercado) throw new NotFoundException('Mercado no encontrado');

    return this.prisma.scoped.puestos.create({
      data: {
        id_lugar: BigInt(createPuestoDto.id_lugar),
        codigo_puesto: createPuestoDto.codigo_puesto,
        referencia: createPuestoDto.referencia,
        estado: createPuestoDto.estado ?? true,
      },
      include: { lugares_operativos: true },
    });
  }

  async findAll(empresaId: number, estado?: boolean, mercadoId?: number, query?: QueryPuestosDto) {
    const where: any = {};
    if (estado !== undefined) where.estado = estado;
    if (mercadoId) where.id_lugar = BigInt(mercadoId);
    if (query?.id_ubigeo || query?.tipo_lugar) where.lugares_operativos = { id_ubigeo: query.id_ubigeo, tipo_lugar: query.tipo_lugar };
    if (query?.buscar) where.OR = [{ codigo_puesto: { contains: query.buscar, mode: 'insensitive' } }, { referencia: { contains: query.buscar, mode: 'insensitive' } }];
    return this.prisma.scoped.puestos.findMany({
      where,
      include: {
        lugares_operativos: {
          include: { distritos: true },
        },
      },
      orderBy: { codigo_puesto: 'asc' },
    });
  }

  async findOne(id: number, empresaId?: number) {
    const where: any = { id_puesto: BigInt(id) };
    

    const puesto = await this.prisma.scoped.puestos.findFirst({
      where,
      include: { lugares_operativos: true },
    });
    if (!puesto) throw new NotFoundException(`Puesto con ID ${id} no encontrado`);
    return puesto;
  }

  async update(id: number, updatePuestoDto: UpdatePuestoDto) {
    const existing = await this.prisma.scoped.puestos.findUnique({
      where: { id_puesto: BigInt(id) },
    });
    if (!existing) throw new NotFoundException(`Puesto con ID ${id} no encontrado`);

    if (updatePuestoDto.id_empresa && this.prisma.empresaId !== BigInt(updatePuestoDto.id_empresa)) {
      throw new ForbiddenException('No tiene permiso para modificar este registro');
    }

    try {
      if (updatePuestoDto.id_lugar) {
        const mercado = await this.prisma.scoped.lugares_operativos.findFirst({
          where: {
            id_lugar: BigInt(updatePuestoDto.id_lugar),
            tipo_lugar: 'mercado',
          },
        });
        if (!mercado) throw new NotFoundException('Mercado no encontrado');
      }

      const updated = await this.prisma.scoped.puestos.update({
        where: { id_puesto: BigInt(id) },
        data: {
          id_lugar: updatePuestoDto.id_lugar ? BigInt(updatePuestoDto.id_lugar) : undefined,
          codigo_puesto: updatePuestoDto.codigo_puesto,
          referencia: updatePuestoDto.referencia,
          estado: updatePuestoDto.estado,
        },
        include: { lugares_operativos: true },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Puesto con ID ${id} no encontrado`);
      throw error;
    }
  }

  async changeState(id: number, estado: boolean, empresaId?: number) {
    if (empresaId) {
      const existing = await this.prisma.scoped.puestos.findFirst({
        where: { id_puesto: BigInt(id) },
      });
      if (!existing) throw new NotFoundException(`Puesto con ID ${id} no encontrado`);
    }
    return this.update(id, { estado });
  }

  async findByMercado(mercadoId: number, estado?: boolean) {
    const mercado = await this.prisma.scoped.lugares_operativos.findFirst({
      where: {
        id_lugar: BigInt(mercadoId),
        tipo_lugar: 'mercado',
      },
    });
    if (!mercado) throw new NotFoundException(`Mercado con ID ${mercadoId} no encontrado`);

    const where: any = { id_lugar: BigInt(mercadoId) };
    if (estado !== undefined) where.estado = estado;

    return this.prisma.scoped.puestos.findMany({
      where,
      include: {
        lugares_operativos: true,
      },
      orderBy: { codigo_puesto: 'asc' },
    });
  }
}
