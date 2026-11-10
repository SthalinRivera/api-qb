import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Empresa } from './entities/empresa.entity';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) { }

  // Helper privado para convertir bigint a number
  private toNumber(empresa: any): Empresa {
    if (!empresa) return empresa;
    return {
      ...empresa,
      id_empresa: Number(empresa.id_empresa),
    };
  }

  async create(createEmpresaDto: CreateEmpresaDto): Promise<Empresa> {
    const newEmpresa = await this.prisma.scoped.empresas.create({
      data: {
        razon_social: createEmpresaDto.razon_social,
        nombre_comercial: createEmpresaDto.nombre_comercial,
        ruc: createEmpresaDto.ruc,
        telefono: createEmpresaDto.telefono,
        direccion: createEmpresaDto.direccion,
        estado: createEmpresaDto.estado ?? true,
      },
    });
    return this.toNumber(newEmpresa);
  }

  async findAll(): Promise<Empresa[]> {
    const empresas = await this.prisma.scoped.empresas.findMany({
      orderBy: { id_empresa: 'asc' },
    });
    return empresas.map(e => this.toNumber(e));
  }

  async findOne(id: number): Promise<Empresa> {
    const empresa = await this.prisma.scoped.empresas.findUnique({
      where: { id_empresa: BigInt(id) },
    });
    if (!empresa) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    return this.toNumber(empresa);
  }

  async update(id: number, updateEmpresaDto: UpdateEmpresaDto): Promise<Empresa> {
    try {
      const updated = await this.prisma.scoped.empresas.update({
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
      return this.toNumber(updated);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
      }
      throw error;
    }
  }

  async changeState(id: number, estado: boolean): Promise<Empresa> {
    return this.update(id, { estado });
  }
}