// src/modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  async getDashboardData(): Promise<DashboardResponseDto> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    // 1. Operaciones de carga de hoy
    const operacionesHoy = await this.prisma.scoped.operaciones_carga.count({
      where: {
        fecha_carga: { gte: hoy, lt: manana },
      },
    });

    // 2. Operaciones en curso (no finalizadas)
    const operacionesEnCurso = await this.prisma.scoped.operaciones_carga.count({
      where: {
        estado: { not: 'finalizado' },
      },
    });

    // 3. Jabas cargadas hoy (sumar cantidad_jabas de detalle_carga)
    const jabasCargadasResult = await this.prisma.scoped.detalle_carga.aggregate({
      where: {
        operaciones_carga: {
          fecha_carga: { gte: hoy, lt: manana },
        },
      },
      _sum: { cantidad_jabas: true },
    });
    const jabasCargadasHoy = jabasCargadasResult._sum.cantidad_jabas || 0;

    // 4. Camiones en ruta (estado = 'en_ruta')
    const camionesEnRuta = await this.prisma.scoped.operaciones_carga.count({
      where: { estado: 'en_ruta' },
    });

    // 5. Alertas/incidencias pendientes (estado = 'abierta')
    const alertasPendientes = await this.prisma.scoped.incidencias.count({
      where: { estado: 'abierta' },
    });

    // 6. Repartos pendientes: items_reparto sin guía asociada
    const repartosPendientes = await this.prisma.scoped.items_reparto.count({
      where: {
        guias_operativas: { none: {} }, // sin guía
      },
    });

    // 7. Entregas realizadas hoy (fecha_entrega = hoy)
    const entregasHoy = await this.prisma.scoped.entregas.count({
      where: {
        fecha_entrega: { gte: hoy, lt: manana },
      },
    });

    // 8. (Opcional) Jabas por tipo
    const jabasPorTipo = await this.prisma.scoped.detalle_carga.groupBy({
      by: ['id_tipo_jaba'],
      where: {
        operaciones_carga: {
          fecha_carga: { gte: hoy, lt: manana },
        },
      },
      _sum: { cantidad_jabas: true },
    });
    // Podrías enriquecer con el nombre del tipo de jaba (necesitarías otra consulta)

    return {
      operacionesHoy,
      operacionesEnCurso,
      jabasCargadasHoy,
      camionesEnRuta,
      alertasPendientes,
      repartosPendientes,
      entregasHoy,
      // jabasPorTipo: transformado
    };
  }
}