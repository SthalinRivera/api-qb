// src/empresas/empresas.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // asume que tienes PrismaModule global
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Empresa } from './entities/empresa.entity';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEmpresaDto: CreateEmpresaDto): Promise<Empresa> {
    const newEmpresa = await this.prisma.empresas.create({
      data: {
        razon_social: createEmpresaDto.razon_social,
        nombre_comercial: createEmpresaDto.nombre_comercial,
        ruc: createEmpresaDto.ruc,
        telefono: createEmpresaDto.telefono,
        direccion: createEmpresaDto.direccion,
        estado: createEmpresaDto.estado ?? true,
      },
    });
    return newEmpresa;
  }

  async findAll(): Promise<Empresa[]> {
    return this.prisma.empresas.findMany({
      orderBy: { id_empresa: 'asc' },
    });
  }

  async findOne(id: bigint | number): Promise<Empresa> {
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(id) },
    });
    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    return empresa;
  }

  async update(id: bigint | number, updateEmpresaDto: UpdateEmpresaDto): Promise<Empresa> {
    try {
      const updated = await this.prisma.empresas.update({
        where: { id_empresa: BigInt(id) },
        data: {
          razon_social: updateEmpresaDto.razon_social,
          nombre_comercial: updateEmpresaDto.nombre_comercial,
          ruc: updateEmpresaDto.ruc,
          telefono: updateEmpresaDto.telefono,
          direccion: updateEmpresaDto.direccion,
          estado: updateEmpresaDto.estado,
        },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
      }
      throw error;
    }
  }

  async remove(id: bigint | number): Promise<void> {
    try {
      await this.prisma.empresas.delete({
        where: { id_empresa: BigInt(id) },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
      }
      throw error;
    }
  }
}