import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
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

  async findAll(empresaId: number, estado?: boolean) {
    const where: any = { id_empresa: BigInt(empresaId) };
    if (estado !== undefined) where.estado = estado;
    return this.prisma.camiones.findMany({
      where,
      include: { empresas: true },
      orderBy: { placa: 'asc' },
    });
  }

  async findOne(id: number, empresaId?: number) {
    const where: any = { id_camion: BigInt(id) };
    if (empresaId) where.id_empresa = BigInt(empresaId);

    const camion = await this.prisma.camiones.findFirst({
      where,
      include: { empresas: true },
    });
    if (!camion) throw new NotFoundException(`Camión con ID ${id} no encontrado`);
    return camion;
  }

  async update(id: number, updateCamionDto: UpdateCamionDto) {
    const existing = await this.prisma.camiones.findUnique({
      where: { id_camion: BigInt(id) },
    });
    if (!existing) throw new NotFoundException(`Camión con ID ${id} no encontrado`);

    if (updateCamionDto.id_empresa && existing.id_empresa !== BigInt(updateCamionDto.id_empresa)) {
      throw new ForbiddenException('No tiene permiso para modificar este registro');
    }

    try {
      const updated = await this.prisma.camiones.update({
        where: { id_camion: BigInt(id) },
        data: {
          placa: updateCamionDto.placa,
          observaciones: updateCamionDto.observaciones,
          descripcion: updateCamionDto.descripcion,
          estado: updateCamionDto.estado,
        },
        include: { empresas: true },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Camión con ID ${id} no encontrado`);
      throw error;
    }
  }

  async changeState(id: number, estado: boolean, empresaId?: number) {
    if (empresaId) {
      const existing = await this.prisma.camiones.findFirst({
        where: { id_camion: BigInt(id), id_empresa: BigInt(empresaId) },
      });
      if (!existing) throw new NotFoundException(`Camión con ID ${id} no encontrado`);
    }
    return this.update(id, { estado });
  }
}
