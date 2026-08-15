import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { QueryReportesDto } from './dto/query-reportes.dto';
import {
  ReporteCargaPorFecha,
  ReporteDetalleCarga,
  ReporteItemsReparto,
  ReporteGuias,
  ReporteEntregas,
  ReporteIncidencias,
  ReporteJabasPorPagar,
  ReporteJabasPorCobrar,
  ReporteRecuperaciones,
  ReporteDevoluciones,
  ReporteClientesPorSede,
  ReporteClientesPorPuesto,
  ReporteHistorialAsignacionPuestos,
  ReporteInventario,
  ReporteUsuariosRoles,
  ReporteActividadUsuarios,
  ReporteModulosPorRol,
} from './dto/reportes-response.dto';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  private getFechaInicio(query: QueryReportesDto): Date {
    return query.fecha_inicio
      ? new Date(query.fecha_inicio)
      : new Date(new Date().setDate(new Date().getDate() - 30));
  }

  private getFechaFin(query: QueryReportesDto): Date {
    if (query.fecha_fin) {
      const fin = new Date(query.fecha_fin);
      fin.setHours(23, 59, 59, 999);
      return fin;
    }
    return new Date();
  }

  async getCargasPorFecha(query: QueryReportesDto): Promise<ReporteCargaPorFecha[]> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const operaciones = await this.prisma.operaciones_carga.groupBy({
      by: ['fecha_carga'],
      where: {
        fecha_carga: { gte: inicio, lte: fin },
        ...(query.estado && { estado: query.estado }),
        ...(query.id_sede && { id_sede_origen: BigInt(query.id_sede) }),
      },
      _count: { id_operacion: true },
      orderBy: { fecha_carga: 'desc' },
    });

    const resultados: ReporteCargaPorFecha[] = [];

    for (const op of operaciones) {
      const detalles = await this.prisma.detalle_carga.findMany({
        where: {
          operaciones_carga: { fecha_carga: op.fecha_carga },
        },
        include: {
          tipos_jaba: { select: { nombre: true } },
          frutas: { select: { nombre: true } },
        },
      });

      const jabasPorTipo: { [key: string]: number } = {};
      const jabasPorFruta: { [key: string]: number } = {};
      let totalJabas = 0;

      for (const d of detalles) {
        totalJabas += d.cantidad_jabas;
        const tipo = d.tipos_jaba?.nombre || 'Sin tipo';
        const fruta = d.frutas?.nombre || 'Sin fruta';
        jabasPorTipo[tipo] = (jabasPorTipo[tipo] || 0) + d.cantidad_jabas;
        jabasPorFruta[fruta] = (jabasPorFruta[fruta] || 0) + d.cantidad_jabas;
      }

      resultados.push({
        fecha: new Date(op.fecha_carga).toISOString().split('T')[0],
        total_operaciones: op._count.id_operacion,
        total_jabas: totalJabas,
        total_detalles: detalles.length,
        jabas_por_tipo: Object.entries(jabasPorTipo).map(([tipo_jaba, cantidad]) => ({
          tipo_jaba,
          cantidad,
        })),
        jabas_por_fruta: Object.entries(jabasPorFruta).map(([fruta, cantidad]) => ({
          fruta,
          cantidad,
        })),
      });
    }

    return resultados;
  }

  async getDetalleCargaPorOperacion(query: QueryReportesDto): Promise<ReporteDetalleCarga[]> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const detalles = await this.prisma.detalle_carga.findMany({
      where: {
        operaciones_carga: {
          fecha_carga: { gte: inicio, lte: fin },
          ...(query.estado && { estado: query.estado }),
          ...(query.id_operacion && { id_operacion: BigInt(query.id_operacion) }),
        },
        ...(query.id_cliente && { id_cliente_emisor: BigInt(query.id_cliente) }),
        ...(query.id_fruta && { id_fruta: BigInt(query.id_fruta) }),
        ...(query.id_tipo_jaba && { id_tipo_jaba: BigInt(query.id_tipo_jaba) }),
      },
      include: {
        operaciones_carga: {
          select: { id_operacion: true, fecha_carga: true, estado: true },
        },
        clientes: { select: { id_cliente: true, nombres: true, apellidos: true } },
        frutas: { select: { id_fruta: true, nombre: true } },
        variedades: { select: { id_variedad: true, nombre: true } },
        tipos_jaba: { select: { id_tipo_jaba: true, nombre: true } },
        detalle_carga_calidades: {
          select: {
            calidades: { select: { nombre: true } },
            cantidad: true,
            precio_unitario: true,
          },
        },
        items_reparto: { select: { id_item_reparto: true } },
      },
      orderBy: { operaciones_carga: { fecha_carga: 'desc' } },
    });

    return detalles.map((d) => ({
      id_detalle_carga: Number(d.id_detalle_carga),
      operacion: {
        id_operacion: Number(d.operaciones_carga.id_operacion),
        fecha_carga: new Date(d.operaciones_carga.fecha_carga).toISOString().split('T')[0],
        estado: d.operaciones_carga.estado || '',
      },
      cliente_emisor: {
        id_cliente: Number(d.clientes.id_cliente),
        nombres: d.clientes.nombres,
        apellidos: d.clientes.apellidos || undefined,
      },
      fruta: { id_fruta: Number(d.frutas.id_fruta), nombre: d.frutas.nombre },
      variedad: d.variedades
        ? { id_variedad: Number(d.variedades.id_variedad), nombre: d.variedades.nombre }
        : undefined,
      tipo_jaba: { id_tipo_jaba: Number(d.tipos_jaba.id_tipo_jaba), nombre: d.tipos_jaba.nombre },
      cantidad_jabas: d.cantidad_jabas,
      calidades: d.detalle_carga_calidades.map((dc) => ({
        nombre: dc.calidades.nombre,
        cantidad: dc.cantidad,
        precio_unitario: dc.precio_unitario ? Number(dc.precio_unitario) : undefined,
      })),
      items_reparto_count: d.items_reparto.length,
    }));
  }

  async getItemsRepartoPorDetalle(query: QueryReportesDto): Promise<ReporteItemsReparto[]> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const items = await this.prisma.items_reparto.findMany({
      where: {
        detalle_carga: {
          operaciones_carga: {
            fecha_carga: { gte: inicio, lte: fin },
          },
        },
        ...(query.id_operacion && {
          detalle_carga: {
            id_operacion: BigInt(query.id_operacion),
          },
        }),
        ...(query.id_puesto && { id_puesto: BigInt(query.id_puesto) }),
        ...(query.id_cliente && { id_cliente_receptor: BigInt(query.id_cliente) }),
      },
      include: {
        clientes: { select: { id_cliente: true, nombres: true, apellidos: true } },
        puestos: { select: { id_puesto: true, numero_puesto: true } },
        guias_operativas: {
          select: { id_guia: true, numero_guia: true, estado: true },
        },
        items_reparto_detalle: {
          select: {
            cantidad: true,
            precio_unitario: true,
            subtotal: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return items.map((item) => ({
      id_item_reparto: Number(item.id_item_reparto),
      detalle_carga: { id_detalle_carga: Number(item.id_detalle_carga) },
      cliente_receptor: item.clientes
        ? {
            id_cliente: Number(item.clientes.id_cliente),
            nombres: item.clientes.nombres,
            apellidos: item.clientes.apellidos || undefined,
          }
        : undefined,
      puesto: {
        id_puesto: Number(item.puestos.id_puesto),
        numero_puesto: item.puestos.numero_puesto,
      },
      cantidad_asignada: item.cantidad_asignada,
      seccion: item.seccion || undefined,
      guia_asociada:
        item.guias_operativas.length > 0
          ? {
              id_guia: Number(item.guias_operativas[0].id_guia),
              numero_guia: item.guias_operativas[0].numero_guia,
              estado: item.guias_operativas[0].estado || '',
            }
          : undefined,
      detalles_calidad: item.items_reparto_detalle.map((ird) => ({
        cantidad: ird.cantidad,
        precio_unitario: ird.precio_unitario ? Number(ird.precio_unitario) : undefined,
        subtotal: ird.subtotal ? Number(ird.subtotal) : undefined,
      })),
    }));
  }

  async getGuiasOperativas(query: QueryReportesDto): Promise<ReporteGuias> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const guias = await this.prisma.guias_operativas.findMany({
      where: {
        fecha_emision: { gte: inicio, lte: fin },
        ...(query.estado && { estado: query.estado }),
        ...(query.id_repartidor && { id_repartidor: BigInt(query.id_repartidor) }),
        ...(query.id_puesto && { id_puesto: BigInt(query.id_puesto) }),
      },
      include: {
        usuarios: { select: { nombres: true, apellidos: true } },
        puestos: { select: { numero_puesto: true } },
        items_reparto: {
          select: {
            id_item_reparto: true,
            items_reparto_detalle: { select: { id_item_reparto_detalle: true } },
          },
        },
        entregas: { select: { id_entrega: true } },
      },
      orderBy: { fecha_emision: 'desc' },
    });

    const totalEmitidas = guias.filter((g) => g.estado === 'emitida').length;
    const totalFirmadas = guias.filter((g) => g.estado === 'firmada').length;
    const totalAnuladas = guias.filter((g) => g.estado === 'anulada').length;
    const totalReemplazadas = guias.filter((g) => g.estado === 'reemplazada').length;
    const totalObservadas = guias.filter((g) => g.estado === 'observada').length;

    return {
      resumen: {
        total_emitidas: totalEmitidas,
        total_firmadas: totalFirmadas,
        total_anuladas: totalAnuladas,
        total_reemplazadas: totalReemplazadas,
        total_observadas: totalObservadas,
      },
      guias: guias.map((g) => ({
        id_guia: Number(g.id_guia),
        numero_guia: g.numero_guia,
        fecha_emision: new Date(g.fecha_emision).toISOString().split('T')[0],
        estado: g.estado || '',
        repartidor: g.usuarios
          ? { nombres: g.usuarios.nombres, apellidos: g.usuarios.apellidos || undefined }
          : undefined,
        puesto: g.puestos ? { numero_puesto: g.puestos.numero_puesto } : undefined,
        cantidad_items: g.items_reparto.items_reparto_detalle?.length || 0,
        entregas_realizadas: g.entregas.length,
      })),
    };
  }

  async getEntregas(query: QueryReportesDto): Promise<ReporteEntregas> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const entregas = await this.prisma.entregas.findMany({
      where: {
        fecha_entrega: { gte: inicio, lte: fin },
        ...(query.estado && { estado_entrega: query.estado }),
        ...(query.id_guia && { id_guia: BigInt(query.id_guia) }),
        ...(query.id_cliente && {
          items_reparto: { id_cliente_receptor: BigInt(query.id_cliente) },
        }),
      },
      include: {
        guias_operativas: { select: { id_guia: true, numero_guia: true } },
        items_reparto: { select: { id_item_reparto: true } },
        usuarios: { select: { nombres: true, apellidos: true } },
        jabas_por_cobrar: { select: { cantidad_original: true, saldo_pendiente: true } },
      },
      orderBy: { fecha_entrega: 'desc' },
    });

    const totalEntregadas = entregas.filter((e) => e.estado_entrega === 'entregado_total').length;
    const totalParcial = entregas.filter((e) => e.estado_entrega === 'entregado_parcial').length;
    const totalRechazadas = entregas.filter((e) => e.estado_entrega === 'rechazado').length;
    const totalObservadas = entregas.filter((e) => e.estado_entrega === 'observado').length;
    const totalPendientes = entregas.filter((e) => e.estado_entrega === 'pendiente').length;
    const cantidadEntregada = entregas.reduce((sum, e) => sum + e.cantidad_entregada, 0);
    const cantidadRechazada = entregas.reduce((sum, e) => sum + (e.cantidad_rechazada || 0), 0);
    const jabasCobradas = entregas.reduce(
      (sum, e) => sum + e.jabas_por_cobrar.reduce((s, j) => s + j.cantidad_original, 0),
      0,
    );
    const jabasPendientes = entregas.reduce(
      (sum, e) => sum + e.jabas_por_cobrar.reduce((s, j) => s + j.saldo_pendiente, 0),
      0,
    );

    return {
      resumen: {
        total_entregas: entregas.length,
        entregadas_total: totalEntregadas,
        entregadas_parcial: totalParcial,
        rechazadas: totalRechazadas,
        observadas: totalObservadas,
        pendientes: totalPendientes,
        cantidad_total_entregada: cantidadEntregada,
        cantidad_total_rechazada: cantidadRechazada,
        jabas_cobradas: jabasCobradas,
        jabas_pendientes: jabasPendientes,
      },
      entregas: entregas.map((e) => ({
        id_entrega: Number(e.id_entrega),
        fecha_entrega: new Date(e.fecha_entrega).toISOString().split('T')[0],
        estado_entrega: e.estado_entrega,
        cantidad_entregada: e.cantidad_entregada,
        cantidad_rechazada: e.cantidad_rechazada || 0,
        firma_recibido: e.firma_recibido || false,
        nombre_recibe: e.nombre_recibe || undefined,
        guia: {
          id_guia: Number(e.guias_operativas.id_guia),
          numero_guia: e.guias_operativas.numero_guia,
        },
        item_reparto: { id_item_reparto: Number(e.items_reparto.id_item_reparto) },
        entregador: e.usuarios
          ? { nombres: e.usuarios.nombres, apellidos: e.usuarios.apellidos || undefined }
          : undefined,
      })),
    };
  }

  async getIncidencias(query: QueryReportesDto): Promise<ReporteIncidencias> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const incidencias = await this.prisma.incidencias.findMany({
      where: {
        fecha_incidencia: { gte: inicio, lte: fin },
        ...(query.estado && { estado: query.estado }),
        ...(query.tipo_incidencia && { tipo_incidencia: query.tipo_incidencia }),
        ...(query.id_operacion && { id_operacion: BigInt(query.id_operacion) }),
        ...(query.id_guia && { id_guia: BigInt(query.id_guia) }),
        ...(query.id_entrega && { id_entrega: BigInt(query.id_entrega) }),
        ...(query.id_usuario && { id_usuario_reporta: BigInt(query.id_usuario) }),
      },
      include: {
        operaciones_carga: { select: { id_operacion: true, fecha_carga: true } },
        guias_operativas: { select: { id_guia: true, numero_guia: true } },
        entregas: { select: { id_entrega: true, fecha_entrega: true } },
        usuarios: { select: { nombres: true, apellidos: true } },
      },
      orderBy: { fecha_incidencia: 'desc' },
    });

    const total = incidencias.length;
    const abiertas = incidencias.filter((i) => i.estado === 'abierta').length;
    const enProceso = incidencias.filter((i) => i.estado === 'en_proceso').length;
    const cerradas = incidencias.filter((i) => i.estado === 'cerrada').length;

    const porTipo: { [key: string]: number } = {};
    incidencias.forEach((i) => {
      porTipo[i.tipo_incidencia] = (porTipo[i.tipo_incidencia] || 0) + 1;
    });

    return {
      resumen: {
        total,
        abiertas,
        en_proceso: enProceso,
        cerradas,
        por_tipo: Object.entries(porTipo).map(([tipo, cantidad]) => ({ tipo, cantidad })),
      },
      incidencias: incidencias.map((i) => ({
        id_incidencia: Number(i.id_incidencia),
        fecha_incidencia: new Date(i.fecha_incidencia).toISOString().split('T')[0],
        hora_incidencia: i.hora_incidencia ? i.hora_incidencia.toISOString() : undefined,
        tipo_incidencia: i.tipo_incidencia,
        descripcion: i.descripcion,
        estado: i.estado || '',
        accion_tomada: i.accion_tomada || undefined,
        operacion: i.operaciones_carga
          ? {
              id_operacion: Number(i.operaciones_carga.id_operacion),
              fecha_carga: new Date(i.operaciones_carga.fecha_carga).toISOString().split('T')[0],
            }
          : undefined,
        guia: i.guias_operativas
          ? { id_guia: Number(i.guias_operativas.id_guia), numero_guia: i.guias_operativas.numero_guia }
          : undefined,
        entrega: i.entregas
          ? {
              id_entrega: Number(i.entregas.id_entrega),
              fecha_entrega: new Date(i.entregas.fecha_entrega).toISOString().split('T')[0],
            }
          : undefined,
        usuario_reporta: i.usuarios
          ? { nombres: i.usuarios.nombres, apellidos: i.usuarios.apellidos || undefined }
          : undefined,
      })),
    };
  }

  async getJabasPorPagar(query: QueryReportesDto): Promise<ReporteJabasPorPagar> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const jabas = await this.prisma.jabas_por_pagar.findMany({
      where: {
        fecha_origen: { gte: inicio, lte: fin },
        ...(query.estado && { estado: query.estado }),
        ...(query.id_cliente && { id_cliente_emisor: BigInt(query.id_cliente) }),
        ...(query.id_tipo_jaba && { id_tipo_jaba: BigInt(query.id_tipo_jaba) }),
      },
      include: {
        clientes: { select: { id_cliente: true, nombres: true, apellidos: true } },
        tipos_jaba: { select: { id_tipo_jaba: true, nombre: true } },
      },
      orderBy: { fecha_origen: 'desc' },
    });

    const totalOriginal = jabas.reduce((sum, j) => sum + j.cantidad_original, 0);
    const totalPagado = jabas.reduce((sum, j) => sum + j.cantidad_pagada, 0);
    const totalPendiente = jabas.reduce((sum, j) => sum + j.saldo_pendiente, 0);

    const porCliente: { [key: string]: { pendiente: number; original: number } } = {};
    jabas.forEach((j) => {
      const cliente = j.clientes ? `${j.clientes.nombres} ${j.clientes.apellidos || ''}`.trim() : 'Sin cliente';
      if (!porCliente[cliente]) porCliente[cliente] = { pendiente: 0, original: 0 };
      porCliente[cliente].pendiente += j.saldo_pendiente;
      porCliente[cliente].original += j.cantidad_original;
    });

    const porTipo: { [key: string]: { pendiente: number; original: number } } = {};
    jabas.forEach((j) => {
      const tipo = j.tipos_jaba?.nombre || 'Sin tipo';
      if (!porTipo[tipo]) porTipo[tipo] = { pendiente: 0, original: 0 };
      porTipo[tipo].pendiente += j.saldo_pendiente;
      porTipo[tipo].original += j.cantidad_original;
    });

    return {
      resumen: {
        total_registros: jabas.length,
        total_original: totalOriginal,
        total_pagado: totalPagado,
        total_pendiente: totalPendiente,
        por_cliente: Object.entries(porCliente).map(([cliente, data]) => ({
          cliente,
          pendiente: data.pendiente,
          original: data.original,
        })),
        por_tipo_jaba: Object.entries(porTipo).map(([tipo_jaba, data]) => ({
          tipo_jaba,
          pendiente: data.pendiente,
          original: data.original,
        })),
      },
      jabas: jabas.map((j) => ({
        id_jaba_pagar: Number(j.id_jaba_pagar),
        fecha_origen: new Date(j.fecha_origen).toISOString().split('T')[0],
        cliente_emisor: {
          id_cliente: Number(j.clientes.id_cliente),
          nombres: j.clientes.nombres,
          apellidos: j.clientes.apellidos || undefined,
        },
        tipo_jaba: {
          id_tipo_jaba: Number(j.tipos_jaba.id_tipo_jaba),
          nombre: j.tipos_jaba.nombre,
        },
        cantidad_original: j.cantidad_original,
        cantidad_pagada: j.cantidad_pagada,
        saldo_pendiente: j.saldo_pendiente,
        estado: j.estado,
      })),
    };
  }

  async getJabasPorCobrar(query: QueryReportesDto): Promise<ReporteJabasPorCobrar> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const jabas = await this.prisma.jabas_por_cobrar.findMany({
      where: {
        fecha_origen: { gte: inicio, lte: fin },
        ...(query.estado && { estado: query.estado }),
        ...(query.id_tipo_jaba && { id_tipo_jaba: BigInt(query.id_tipo_jaba) }),
      },
      include: {
        tipos_jaba: { select: { id_tipo_jaba: true, nombre: true } },
        entregas: { select: { id_entrega: true, fecha_entrega: true } },
      },
      orderBy: { fecha_origen: 'desc' },
    });

    const totalOriginal = jabas.reduce((sum, j) => sum + j.cantidad_original, 0);
    const totalRecuperada = jabas.reduce((sum, j) => sum + j.cantidad_recuperada, 0);
    const totalPendiente = jabas.reduce((sum, j) => sum + j.saldo_pendiente, 0);

    const porTipo: { [key: string]: { pendiente: number; original: number } } = {};
    jabas.forEach((j) => {
      const tipo = j.tipos_jaba?.nombre || 'Sin tipo';
      if (!porTipo[tipo]) porTipo[tipo] = { pendiente: 0, original: 0 };
      porTipo[tipo].pendiente += j.saldo_pendiente;
      porTipo[tipo].original += j.cantidad_original;
    });

    return {
      resumen: {
        total_registros: jabas.length,
        total_original: totalOriginal,
        total_recuperada: totalRecuperada,
        total_pendiente: totalPendiente,
        por_tipo_jaba: Object.entries(porTipo).map(([tipo_jaba, data]) => ({
          tipo_jaba,
          pendiente: data.pendiente,
          original: data.original,
        })),
      },
      jabas: jabas.map((j) => ({
        id_jaba_cobrar: Number(j.id_jaba_cobrar),
        fecha_origen: new Date(j.fecha_origen).toISOString().split('T')[0],
        tipo_jaba: {
          id_tipo_jaba: Number(j.tipos_jaba.id_tipo_jaba),
          nombre: j.tipos_jaba.nombre,
        },
        cantidad_original: j.cantidad_original,
        cantidad_recuperada: j.cantidad_recuperada,
        saldo_pendiente: j.saldo_pendiente,
        estado: j.estado,
        entrega: {
          id_entrega: Number(j.entregas.id_entrega),
          fecha_entrega: new Date(j.entregas.fecha_entrega).toISOString().split('T')[0],
        },
      })),
    };
  }

  async getRecuperaciones(query: QueryReportesDto): Promise<ReporteRecuperaciones> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const recuperaciones = await this.prisma.recuperaciones_jabas.findMany({
      where: {
        fecha_recuperacion: { gte: inicio, lte: fin },
        ...(query.tipo_incidencia && { tipo_recuperacion: query.tipo_incidencia }),
      },
      include: {
        jabas_por_cobrar: { select: { id_jaba_cobrar: true, fecha_origen: true } },
        usuarios: { select: { nombres: true, apellidos: true } },
      },
      orderBy: { fecha_recuperacion: 'desc' },
    });

    const totalCantidad = recuperaciones.reduce((sum, r) => sum + r.cantidad, 0);
    const porTipo: { [key: string]: number } = {};
    recuperaciones.forEach((r) => {
      porTipo[r.tipo_recuperacion] = (porTipo[r.tipo_recuperacion] || 0) + r.cantidad;
    });

    return {
      resumen: {
        total_recuperaciones: recuperaciones.length,
        cantidad_total: totalCantidad,
        por_tipo: Object.entries(porTipo).map(([tipo, cantidad]) => ({ tipo, cantidad })),
      },
      recuperaciones: recuperaciones.map((r) => ({
        id_recuperacion: Number(r.id_recuperacion),
        fecha_recuperacion: new Date(r.fecha_recuperacion).toISOString().split('T')[0],
        tipo_recuperacion: r.tipo_recuperacion,
        cantidad: r.cantidad,
        jaba_cobrar: {
          id_jaba_cobrar: Number(r.jabas_por_cobrar.id_jaba_cobrar),
          fecha_origen: new Date(r.jabas_por_cobrar.fecha_origen).toISOString().split('T')[0],
        },
        usuario_responsable: r.usuarios
          ? { nombres: r.usuarios.nombres, apellidos: r.usuarios.apellidos || undefined }
          : undefined,
      })),
    };
  }

  async getDevoluciones(query: QueryReportesDto): Promise<ReporteDevoluciones> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const devoluciones = await this.prisma.devoluciones_jabas_emisor.findMany({
      where: {
        fecha_devolucion: { gte: inicio, lte: fin },
        ...(query.tipo_incidencia && { tipo_devolucion: query.tipo_incidencia }),
      },
      include: {
        jabas_por_pagar: { select: { id_jaba_pagar: true, fecha_origen: true } },
        usuarios: { select: { nombres: true, apellidos: true } },
      },
      orderBy: { fecha_devolucion: 'desc' },
    });

    const totalCantidad = devoluciones.reduce((sum, d) => sum + d.cantidad, 0);
    const porTipo: { [key: string]: number } = {};
    devoluciones.forEach((d) => {
      porTipo[d.tipo_devolucion] = (porTipo[d.tipo_devolucion] || 0) + d.cantidad;
    });

    return {
      resumen: {
        total_devoluciones: devoluciones.length,
        cantidad_total: totalCantidad,
        por_tipo: Object.entries(porTipo).map(([tipo, cantidad]) => ({ tipo, cantidad })),
      },
      devoluciones: devoluciones.map((d) => ({
        id_devolucion: Number(d.id_devolucion),
        fecha_devolucion: new Date(d.fecha_devolucion).toISOString().split('T')[0],
        tipo_devolucion: d.tipo_devolucion,
        cantidad: d.cantidad,
        jaba_pagar: {
          id_jaba_pagar: Number(d.jabas_por_pagar.id_jaba_pagar),
          fecha_origen: new Date(d.jabas_por_pagar.fecha_origen).toISOString().split('T')[0],
        },
        usuario_responsable: d.usuarios
          ? { nombres: d.usuarios.nombres, apellidos: d.usuarios.apellidos || undefined }
          : undefined,
      })),
    };
  }

  async getClientesPorSede(query: QueryReportesDto): Promise<ReporteClientesPorSede[]> {
    const where: any = {
      estado: true,
      ...(query.id_cliente && { id_cliente: BigInt(query.id_cliente) }),
    };

    if (query.id_sede) {
      where.cliente_sede = { some: { id_sede: BigInt(query.id_sede) } };
    }

    const sedes = await this.prisma.sedes.findMany({
      where: query.id_sede ? { id_sede: BigInt(query.id_sede) } : { estado: true },
      include: {
        cliente_sede: {
          include: {
            clientes: {
              include: {
                clientes_puestos: {
                  include: {
                    puestos: {
                      include: { lugares_operativos: { select: { nombre: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return sedes.map((sede) => ({
      sede: {
        id_sede: Number(sede.id_sede),
        nombre: sede.nombre,
        ciudad: sede.ciudad || undefined,
      },
      total_clientes: sede.cliente_sede.length,
      clientes: sede.cliente_sede.map((cs) => ({
        id_cliente: Number(cs.clientes.id_cliente),
        nombres: cs.clientes.nombres,
        apellidos: cs.clientes.apellidos || undefined,
        tipo_relacion: cs.tipo_relacion,
        puestos_asignados: cs.clientes.clientes_puestos
          .filter((cp) => cp.estado)
          .map((cp) => ({
            numero_puesto: cp.puestos.numero_puesto,
            lugar: cp.puestos.lugares_operativos?.nombre || '',
            seccion: cp.seccion || undefined,
          })),
      })),
    }));
  }

  async getClientesPorPuesto(query: QueryReportesDto): Promise<ReporteClientesPorPuesto[]> {
    const where: any = {
      estado: true,
      ...(query.id_puesto && { id_puesto: BigInt(query.id_puesto) }),
    };

    const puestos = await this.prisma.puestos.findMany({
      where: query.id_puesto ? { id_puesto: BigInt(query.id_puesto) } : { estado: true },
      include: {
        lugares_operativos: {
          select: {
            nombre: true,
            sedes: { select: { nombre: true } },
          },
        },
        clientes_puestos: {
          where: { estado: true },
          include: {
            clientes: { select: { id_cliente: true, nombres: true, apellidos: true } },
          },
        },
      },
    });

    return puestos.map((puesto) => ({
      puesto: {
        id_puesto: Number(puesto.id_puesto),
        numero_puesto: puesto.numero_puesto,
        lugar: puesto.lugares_operativos?.nombre || '',
        sede: puesto.lugares_operativos?.sedes?.nombre || '',
      },
      total_clientes: puesto.clientes_puestos.length,
      clientes: puesto.clientes_puestos.map((cp) => ({
        id_cliente: Number(cp.clientes.id_cliente),
        nombres: cp.clientes.nombres,
        apellidos: cp.clientes.apellidos || undefined,
        fecha_inicio: cp.fecha_inicio ? new Date(cp.fecha_inicio).toISOString().split('T')[0] : '',
        seccion: cp.seccion || undefined,
        estado: cp.estado || false,
      })),
    }));
  }

  async getHistorialAsignacionPuestos(
    query: QueryReportesDto,
  ): Promise<ReporteHistorialAsignacionPuestos> {
    const where: any = {
      ...(query.id_cliente && { id_cliente: BigInt(query.id_cliente) }),
      ...(query.id_puesto && { id_puesto: BigInt(query.id_puesto) }),
    };

    if (query.fecha_inicio || query.fecha_fin) {
      where.AND = [];
      if (query.fecha_inicio) {
        where.AND.push({ fecha_inicio: { gte: new Date(query.fecha_inicio) } });
      }
      if (query.fecha_fin) {
        where.AND.push({ fecha_inicio: { lte: new Date(query.fecha_fin) } });
      }
    }

    const asignaciones = await this.prisma.clientes_puestos.findMany({
      where,
      include: {
        clientes: { select: { id_cliente: true, nombres: true, apellidos: true } },
        puestos: {
          include: {
            lugares_operativos: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fecha_inicio: 'desc' },
    });

    return {
      total_asignaciones: asignaciones.length,
      asignaciones: asignaciones.map((a) => ({
        id_cliente_puesto: Number(a.id_cliente_puesto),
        fecha_inicio: a.fecha_inicio
          ? new Date(a.fecha_inicio).toISOString().split('T')[0]
          : '',
        fecha_fin: a.fecha_fin ? new Date(a.fecha_fin).toISOString().split('T')[0] : undefined,
        estado: a.estado || false,
        seccion: a.seccion || undefined,
        cliente: {
          id_cliente: Number(a.clientes.id_cliente),
          nombres: a.clientes.nombres,
          apellidos: a.clientes.apellidos || undefined,
        },
        puesto: {
          id_puesto: Number(a.puestos.id_puesto),
          numero_puesto: a.puestos.numero_puesto,
          lugar: a.puestos.lugares_operativos?.nombre || '',
        },
      })),
    };
  }

  async getInventario(query: QueryReportesDto): Promise<ReporteInventario> {
    const frutas = await this.prisma.frutas.findMany({
      where: { estado: true },
      include: {
        variedades: { select: { id_variedad: true } },
        detalle_carga: {
          select: { cantidad_jabas: true },
        },
      },
    });

    const variedades = await this.prisma.variedades.findMany({
      where: { estado: true },
      include: {
        frutas: { select: { nombre: true } },
        detalle_carga: {
          select: { cantidad_jabas: true },
        },
      },
    });

    const calidades = await this.prisma.calidades.findMany({
      where: { estado: true },
      include: {
        detalle_carga_calidades: {
          select: { cantidad: true, precio_unitario: true },
        },
      },
    });

    const tiposJaba = await this.prisma.tipos_jaba.findMany({
      where: { estado: true },
      include: {
        detalle_carga: { select: { cantidad_jabas: true } },
        jabas_por_cobrar: { select: { saldo_pendiente: true } },
        jabas_por_pagar: { select: { saldo_pendiente: true } },
      },
    });

    return {
      frutas: frutas.map((f) => ({
        id_fruta: Number(f.id_fruta),
        nombre: f.nombre,
        estado: f.estado || false,
        total_variedades: f.variedades.length,
        total_detalles_carga: f.detalle_carga.length,
        total_jabas: f.detalle_carga.reduce((sum, d) => sum + d.cantidad_jabas, 0),
      })),
      variedades: variedades.map((v) => ({
        id_variedad: Number(v.id_variedad),
        nombre: v.nombre,
        fruta: v.frutas?.nombre || '',
        estado: v.estado || false,
        total_detalles_carga: v.detalle_carga.length,
        total_jabas: v.detalle_carga.reduce((sum, d) => sum + d.cantidad_jabas, 0),
      })),
      calidades: calidades.map((c) => ({
        id_calidad: Number(c.id_calidad),
        nombre: c.nombre,
        estado: c.estado || false,
        total_usos: c.detalle_carga_calidades.length,
        cantidad_total: c.detalle_carga_calidades.reduce((sum, dc) => sum + dc.cantidad, 0),
        monto_total: c.detalle_carga_calidades.reduce(
          (sum, dc) => sum + (dc.precio_unitario ? Number(dc.precio_unitario) * dc.cantidad : 0),
          0,
        ),
      })),
      tipos_jaba: tiposJaba.map((t) => ({
        id_tipo_jaba: Number(t.id_tipo_jaba),
        nombre: t.nombre,
        tipo_material: t.tipo_material || undefined,
        estado: t.estado || false,
        total_cargas: t.detalle_carga.length,
        total_jabas: t.detalle_carga.reduce((sum, d) => sum + d.cantidad_jabas, 0),
        jabas_por_cobrar: t.jabas_por_cobrar.reduce((sum, j) => sum + j.saldo_pendiente, 0),
        jabas_por_pagar: t.jabas_por_pagar.reduce((sum, j) => sum + j.saldo_pendiente, 0),
      })),
    };
  }

  async getUsuariosRoles(query: QueryReportesDto): Promise<ReporteUsuariosRoles> {
    const usuarios = await this.prisma.usuarios.findMany({
      where: {
        estado: true,
        ...(query.id_usuario && { id_usuario: BigInt(query.id_usuario) }),
      },
      include: {
        usuarios_roles: {
          include: {
            roles_usuarios: { select: { nombre: true } },
          },
        },
        sedes: { select: { nombre: true } },
        operaciones_carga_operaciones_carga_id_encargado_cargaTousuarios: {
          select: { id_operacion: true },
        },
        entregas: { select: { id_entrega: true } },
        logs_actividad: { select: { id_log: true } },
      },
    });

    const totalActivos = usuarios.filter((u) => u.estado).length;
    const totalInactivos = usuarios.filter((u) => !u.estado).length;

    const porRol: { [key: string]: number } = {};
    usuarios.forEach((u) => {
      u.usuarios_roles.forEach((ur) => {
        const rol = ur.roles_usuarios?.nombre || 'Sin rol';
        porRol[rol] = (porRol[rol] || 0) + 1;
      });
    });

    return {
      resumen: {
        total_usuarios: usuarios.length,
        usuarios_activos: totalActivos,
        usuarios_inactivos: totalInactivos,
        por_rol: Object.entries(porRol).map(([rol, cantidad]) => ({ rol, cantidad })),
      },
      usuarios: usuarios.map((u) => ({
        id_usuario: Number(u.id_usuario),
        nombres: u.nombres,
        apellidos: u.apellidos || undefined,
        email: u.email,
        estado: u.estado || false,
        sede: u.sedes?.nombre || '',
        roles: u.usuarios_roles.map((ur) => ur.roles_usuarios?.nombre || ''),
        total_operaciones:
          u.operaciones_carga_operaciones_carga_id_encargado_cargaTousuarios.length,
        total_entregas: u.entregas.length,
        total_logs: u.logs_actividad.length,
      })),
    };
  }

  async getActividadUsuarios(query: QueryReportesDto): Promise<ReporteActividadUsuarios> {
    const inicio = this.getFechaInicio(query);
    const fin = this.getFechaFin(query);

    const logs = await this.prisma.logs_actividad.findMany({
      where: {
        created_at: { gte: inicio, lte: fin },
        ...(query.id_usuario && { id_usuario: BigInt(query.id_usuario) }),
      },
      include: {
        usuarios: { select: { id_usuario: true, nombres: true, apellidos: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const porUsuario: { [key: string]: number } = {};
    const porAccion: { [key: string]: number } = {};
    const porTabla: { [key: string]: number } = {};

    logs.forEach((l) => {
      const usuario = l.usuarios
        ? `${l.usuarios.nombres} ${l.usuarios.apellidos || ''}`.trim()
        : 'Sistema';
      porUsuario[usuario] = (porUsuario[usuario] || 0) + 1;
      porAccion[l.accion] = (porAccion[l.accion] || 0) + 1;
      if (l.tabla_afectada) {
        porTabla[l.tabla_afectada] = (porTabla[l.tabla_afectada] || 0) + 1;
      }
    });

    return {
      resumen: {
        total_logs: logs.length,
        por_usuario: Object.entries(porUsuario)
          .map(([usuario, total]) => ({ usuario, total }))
          .sort((a, b) => b.total - a.total),
        por_accion: Object.entries(porAccion)
          .map(([accion, total]) => ({ accion, total }))
          .sort((a, b) => b.total - a.total),
        por_tabla: Object.entries(porTabla)
          .map(([tabla, total]) => ({ tabla, total }))
          .sort((a, b) => b.total - a.total),
      },
      logs: logs.map((l) => ({
        id_log: Number(l.id_log),
        accion: l.accion,
        tabla_afectada: l.tabla_afectada || undefined,
        id_registro: l.id_registro ? String(l.id_registro) : undefined,
        created_at: l.created_at ? l.created_at.toISOString() : '',
        usuario: l.usuarios
          ? {
              id_usuario: Number(l.usuarios.id_usuario),
              nombres: l.usuarios.nombres,
              apellidos: l.usuarios.apellidos || undefined,
            }
          : undefined,
      })),
    };
  }

  async getModulosPorRol(query: QueryReportesDto): Promise<ReporteModulosPorRol> {
    const roles = await this.prisma.roles_usuarios.findMany({
      where: { estado: true },
      include: {
        roles_modulos: {
          include: {
            modulos: {
              include: {
                categorias: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    return {
      roles: roles.map((r) => ({
        id_rol_usuario: Number(r.id_rol_usuario),
        nombre: r.nombre,
        descripcion: r.descripcion || undefined,
        total_modulos: r.roles_modulos.length,
        modulos: r.roles_modulos.map((rm) => ({
          id_modulo: Number(rm.modulos.id_modulo),
          nombre: rm.modulos.nombre,
          ruta: rm.modulos.ruta,
          categoria: rm.modulos.categorias?.nombre || '',
        })),
      })),
    };
  }
}
