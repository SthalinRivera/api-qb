import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePuestoDto } from './dto/create-puesto.dto';
import { UpdatePuestoDto } from './dto/update-puesto.dto';

@Injectable()
export class PuestosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPuestoDto: CreatePuestoDto) {
    // Verificar empresa
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createPuestoDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    // Verificar mercado (lugar_operativo tipo mercado)
    const mercado = await this.prisma.lugares_operativos.findFirst({
      where: {
        id_lugar: BigInt(createPuestoDto.id_lugar),
        tipo_lugar: 'mercado',
      },
    });
    if (!mercado) throw new NotFoundException('Mercado no encontrado');

    return this.prisma.puestos.create({
      data: {
        id_empresa: BigInt(createPuestoDto.id_empresa),
        id_lugar: BigInt(createPuestoDto.id_lugar),
        numero_puesto: createPuestoDto.numero_puesto,
        referencia: createPuestoDto.referencia,
        estado: createPuestoDto.estado ?? true,
      },
      include: { empresas: true, lugares_operativos: true },
    });
  }

  async findAll() {
    return this.prisma.puestos.findMany({
      where: { estado: true },
      include: { empresas: true, lugares_operativos: true },
      orderBy: { numero_puesto: 'asc' },
    });
  }

  async findOne(id: number) {
    const puesto = await this.prisma.puestos.findUnique({
      where: { id_puesto: BigInt(id) },
      include: { empresas: true, lugares_operativos: true },
    });
    if (!puesto) throw new NotFoundException(`Puesto con ID ${id} no encontrado`);
    return puesto;
  }

  async update(id: number, updatePuestoDto: UpdatePuestoDto) {
    try {
      // Si se actualiza el mercado, verificar que exista y sea tipo mercado
      if (updatePuestoDto.id_lugar) {
        const mercado = await this.prisma.lugares_operativos.findFirst({
          where: {
            id_lugar: BigInt(updatePuestoDto.id_lugar),
            tipo_lugar: 'mercado',
          },
        });
        if (!mercado) throw new NotFoundException('Mercado no encontrado');
      }

      const updated = await this.prisma.puestos.update({
        where: { id_puesto: BigInt(id) },
        data: {
          id_empresa: updatePuestoDto.id_empresa ? BigInt(updatePuestoDto.id_empresa) : undefined,
          id_lugar: updatePuestoDto.id_lugar ? BigInt(updatePuestoDto.id_lugar) : undefined,
          numero_puesto: updatePuestoDto.numero_puesto,
          referencia: updatePuestoDto.referencia,
          estado: updatePuestoDto.estado,
        },
        include: { empresas: true, lugares_operativos: true },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Puesto con ID ${id} no encontrado`);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      const updated = await this.prisma.puestos.update({
        where: { id_puesto: BigInt(id) },
        data: { estado: false },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Puesto con ID ${id} no encontrado`);
      throw error;
    }
  }

  // Puestos por mercado
  async findByMercado(mercadoId: number) {
    const mercado = await this.prisma.lugares_operativos.findFirst({
      where: { id_lugar: BigInt(mercadoId), tipo_lugar: 'mercado' },
    });
    if (!mercado) throw new NotFoundException(`Mercado con ID ${mercadoId} no encontrado`);

    return this.prisma.puestos.findMany({
      where: { id_lugar: BigInt(mercadoId), estado: true },
      include: { empresas: true, lugares_operativos: true },
      orderBy: { numero_puesto: 'asc' },
    });
  }

  // Puestos de un cliente (relación clientes_puestos)
  async findByCliente(clienteId: number) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: BigInt(clienteId) },
    });
    if (!cliente) throw new NotFoundException(`Cliente con ID ${clienteId} no encontrado`);

    // Obtener puestos activos del cliente mediante la tabla intermedia
    const puestos = await this.prisma.puestos.findMany({
      where: {
        clientes_puestos: {
          some: {
            id_cliente: BigInt(clienteId),
            fecha_fin: null, // relación activa
            estado: true,
          },
        },
        estado: true,
      },
      include: { empresas: true, lugares_operativos: true },
    });
    return puestos;
  }
}