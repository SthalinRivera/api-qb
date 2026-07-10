// src/modules/logs-actividad/logs-actividad.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class LogsActividadService {
  constructor(private prisma: PrismaService) {}

  async findAll(empresaId: number, filters?: { tabla?: string; id_usuario?: number; fechaDesde?: string; fechaHasta?: string }) {
    const where: any = { id_empresa: empresaId };

    if (filters?.tabla) {
      where.tabla_afectada = filters.tabla;
    }
    if (filters?.id_usuario) {
      where.id_usuario = filters.id_usuario;
    }
    if (filters?.fechaDesde || filters?.fechaHasta) {
      where.created_at = {};
      if (filters.fechaDesde) {
        where.created_at.gte = new Date(filters.fechaDesde);
      }
      if (filters.fechaHasta) {
        where.created_at.lte = new Date(filters.fechaHasta);
      }
    }

    return this.prisma.logs_actividad.findMany({
      where,
      include: {
        usuarios: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
  }

  async findOne(id: number) {
    return this.prisma.logs_actividad.findUnique({
      where: { id_log: id },
      include: {
        usuarios: {
          select: { id_usuario: true, nombres: true, apellidos: true },
        },
        empresas: {
          select: { razon_social: true },
        },
      },
    });
  }

  async create(data: {
    id_empresa?: number;
    id_usuario?: number;
    accion: string;
    tabla_afectada?: string;
    id_registro?: number;
    datos_anteriores?: any;
    datos_nuevos?: any;
  }) {
    return this.prisma.logs_actividad.create({
      data: {
        id_empresa: data.id_empresa || null,
        id_usuario: data.id_usuario || null,
        accion: data.accion,
        tabla_afectada: data.tabla_afectada || null,
        id_registro: data.id_registro || null,
        datos_anteriores: data.datos_anteriores || null,
        datos_nuevos: data.datos_nuevos || null,
      },
    });
  }

  async getTables() {
    const result = await this.prisma.logs_actividad.groupBy({
      by: ['tabla_afectada'],
      _count: { id_log: true },
      orderBy: { _count: { id_log: 'desc' } },
    });
    return result.map(r => ({ tabla: r.tabla_afectada, count: r._count.id_log }));
  }

  async getStats(empresaId: number) {
    const total = await this.prisma.logs_actividad.count({
      where: { id_empresa: empresaId },
    });
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyCount = await this.prisma.logs_actividad.count({
      where: {
        id_empresa: empresaId,
        created_at: { gte: hoy },
      },
    });
    return { total, hoy: hoyCount };
  }
}
