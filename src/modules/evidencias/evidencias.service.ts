// src/modules/evidencias/evidencias.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { R2Service } from '../../common/shared/r2.service';

@Injectable()
export class EvidenciasService {
  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

  async findAll(empresaId: number) {
    return this.prisma.scoped.evidencias.findMany({
      where: { id_empresa: empresaId },
      include: {
        usuarios: {
          select: { nombres: true, apellidos: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByEntity(tipoEntidad: string, idEntidad: number) {
    return this.prisma.scoped.evidencias.findMany({
      where: {
        tipo_entidad: tipoEntidad,
        id_entidad: idEntidad,
      },
      include: {
        usuarios: {
          select: { nombres: true, apellidos: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: number) {
    const evidencia = await this.prisma.scoped.evidencias.findUnique({
      where: { id_evidencia: id },
      include: {
        usuarios: {
          select: { nombres: true, apellidos: true },
        },
        empresas: {
          select: { razon_social: true },
        },
      },
    });
    if (!evidencia) {
      throw new NotFoundException(`Evidencia con ID ${id} no encontrada`);
    }
    return evidencia;
  }

  async create(data: {
    tipo_entidad: string;
    id_entidad: number;
    url_archivo: string;
    tipo_archivo?: string;
    descripcion?: string;
    id_empresa: number;
    subido_por?: number;
  }) {
    return this.prisma.scoped.evidencias.create({
      data: {
        id_empresa: data.id_empresa,
        tipo_entidad: data.tipo_entidad,
        id_entidad: data.id_entidad,
        url_archivo: data.url_archivo,
        tipo_archivo: data.tipo_archivo || 'image',
        descripcion: data.descripcion || null,
        subido_por: data.subido_por || null,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    tipoEntidad: string,
    idEntidad: number,
    idEmpresa: number,
    idUsuario: number,
    descripcion?: string,
  ) {
    const urls = await this.r2Service.uploadMultiple([file], tipoEntidad + 's');
    const url = urls[0];

    return this.create({
      tipo_entidad: tipoEntidad,
      id_entidad: idEntidad,
      url_archivo: url,
      tipo_archivo: file.mimetype.startsWith('image/') ? 'image' : 'document',
      descripcion,
      id_empresa: idEmpresa,
      subido_por: idUsuario,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.scoped.evidencias.delete({
      where: { id_evidencia: id },
    });
  }

  async countByEntity(empresaId: number) {
    const incidencias = await this.prisma.scoped.evidencias.count({
      where: { id_empresa: empresaId, tipo_entidad: 'incidencia' },
    });
    const entregas = await this.prisma.scoped.evidencias.count({
      where: { id_empresa: empresaId, tipo_entidad: 'entrega' },
    });
    const guias = await this.prisma.scoped.evidencias.count({
      where: { id_empresa: empresaId, tipo_entidad: 'guia' },
    });
    return { incidencias, entregas, guias, total: incidencias + entregas + guias };
  }
}
