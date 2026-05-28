import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCamionDto } from './dto/create-camione.dto';
import { UpdateCamionDto } from './dto/update-camione.dto';

@Injectable()
export class CamionesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createCamionDto: CreateCamionDto) {
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createCamionDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.camiones.create({
      data: {
        id_empresa: BigInt(createCamionDto.id_empresa),
        placa: createCamionDto.placa,
        observaciones: createCamionDto.observaciones,
        descripcion: createCamionDto.descripcion,
        estado: createCamionDto.estado ?? true,
      },
      include: { empresas: true },
    });
  }

  async findAll() {
    return this.prisma.camiones.findMany({
      where: { estado: true },
      include: { empresas: true },
      orderBy: { placa: 'asc' },
    });
  }

  async findOne(id: number) {
    const camion = await this.prisma.camiones.findUnique({
      where: { id_camion: BigInt(id) },
      include: { empresas: true },
    });
    if (!camion) throw new NotFoundException(`Camión con ID ${id} no encontrado`);
    return camion;
  }

  async update(id: number, updateCamionDto: UpdateCamionDto) {
    try {
      const updated = await this.prisma.camiones.update({
        where: { id_camion: BigInt(id) },
        data: {
          id_empresa: updateCamionDto.id_empresa ? BigInt(updateCamionDto.id_empresa) : undefined,
          placa: updateCamionDto.placa,
          observaciones: updateCamionDto.observaciones,
          descripcion: updateCamionDto.descripcion,
          estado: updateCamionDto.estado,
        },
        include: { empresas: true },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Camión con ID ${id} no encontrado`);
      throw error;
    }
  }

  async remove(id: number) {
    // Soft delete: cambiar estado a false
    try {
      const updated = await this.prisma.camiones.update({
        where: { id_camion: BigInt(id) },
        data: { estado: false },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Camión con ID ${id} no encontrado`);
      throw error;
    }
  }
}