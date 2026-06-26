import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateRecuperacionDto } from './dto/create-recuperacion.dto';
import { CreateDevolucionEmisorDto } from './dto/create-devolucion-emisor.dto';
import { QueryParamsDto } from './dto/query-params.dto';

@Injectable()
export class JabasService {
  constructor(private prisma: PrismaService) { }

  // ==================== JABAS POR PAGAR ====================

  async listarJabasPorPagar(params: QueryParamsDto, empresaId: number) {
    const { id_cliente, estado, fecha_desde, fecha_hasta, id_tipo_jaba } = params;

    return this.prisma.jabas_por_pagar.findMany({
      where: {
        id_empresa: empresaId,
        ...(id_cliente && { id_cliente_emisor: id_cliente }),
        ...(estado && { estado }),
        ...(fecha_desde && { fecha_origen: { gte: new Date(fecha_desde) } }),
        ...(fecha_hasta && { fecha_origen: { lte: new Date(fecha_hasta) } }),
        ...(id_tipo_jaba && { id_tipo_jaba }),
      },
      include: {
        clientes: true,
        tipos_jaba: true,
        detalle_carga: {
          include: {
            operaciones_carga: true,
            frutas: true,
            variedades: true,
          },
        },
        devoluciones_jabas_emisor: {
          orderBy: { fecha_devolucion: 'desc' },
        },
      },
      orderBy: { fecha_origen: 'desc' },
    });
  }

  async obtenerJabaPagar(id: number, empresaId: number) {
    const registro = await this.prisma.jabas_por_pagar.findFirst({
      where: { id_jaba_pagar: id, id_empresa: empresaId },
      include: {
        clientes: true,
        tipos_jaba: true,
        detalle_carga: {
          include: { operaciones_carga: true, frutas: true, variedades: true },
        },
        devoluciones_jabas_emisor: {
          orderBy: { fecha_devolucion: 'desc' },
        },
      },
    });
    if (!registro) throw new NotFoundException('Registro no encontrado');
    return registro;
  }

  // ==================== JABAS POR COBRAR ====================

  async listarJabasPorCobrar(params: QueryParamsDto, empresaId: number) {
    const { id_cliente, estado, fecha_desde, fecha_hasta, id_tipo_jaba } = params;

    return this.prisma.jabas_por_cobrar.findMany({
      where: {
        id_empresa: empresaId,
        ...(id_cliente && { id_cliente_receptor: id_cliente }),
        ...(estado && { estado }),
        ...(fecha_desde && { fecha_origen: { gte: new Date(fecha_desde) } }),
        ...(fecha_hasta && { fecha_origen: { lte: new Date(fecha_hasta) } }),
        ...(id_tipo_jaba && { id_tipo_jaba }),
      },
      include: {
        clientes: true,
        tipos_jaba: true,
        puestos: true,
        entregas: {
          include: {
            guias_operativas: true,
          },
        },
        items_reparto: {
          include: {
            detalle_carga: true,
          },
        },
        recuperaciones_jabas: {
          orderBy: { fecha_recuperacion: 'desc' },
        },
      },
      orderBy: { fecha_origen: 'desc' },
    });
  }

  async obtenerJabaCobrar(id: number, empresaId: number) {
    const registro = await this.prisma.jabas_por_cobrar.findFirst({
      where: { id_jaba_cobrar: id, id_empresa: empresaId },
      include: {
        clientes: true,
        tipos_jaba: true,
        puestos: true,
        entregas: {
          include: { guias_operativas: true },
        },
        items_reparto: {
          include: { detalle_carga: true },
        },
        recuperaciones_jabas: {
          orderBy: { fecha_recuperacion: 'desc' },
        },
      },
    });
    if (!registro) throw new NotFoundException('Registro no encontrado');
    return registro;
  }

  // ==================== RECUPERACIONES (de receptor a empresa) ====================

  async registrarRecuperacion(data: CreateRecuperacionDto, empresaId: number, usuarioId?: number) {
    const { id_jaba_cobrar, cantidad, id_usuario_responsable, ...rest } = data;

    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener registro de jaba por cobrar
      const jabaCobrar = await tx.jabas_por_cobrar.findFirst({
        where: { id_jaba_cobrar, id_empresa: empresaId },
      });
      if (!jabaCobrar) throw new NotFoundException('Jaba por cobrar no encontrada');
      if (cantidad > jabaCobrar.saldo_pendiente) {
        throw new BadRequestException(
          `La cantidad (${cantidad}) excede el saldo pendiente (${jabaCobrar.saldo_pendiente})`
        );
      }

      // 2. Calcular nuevo saldo
      const nuevoSaldo = jabaCobrar.saldo_pendiente - cantidad;
      const nuevaRecuperada = jabaCobrar.cantidad_recuperada + cantidad;
      const nuevoEstado = nuevoSaldo === 0 ? 'completado' : 'parcial';

      // 3. Crear recuperación
      const recuperacion = await tx.recuperaciones_jabas.create({
        data: {
          id_empresa: empresaId,
          id_jaba_cobrar,
          cantidad,
          saldo_resultante: nuevoSaldo,
          id_usuario_responsable: id_usuario_responsable ?? usuarioId,
          ...rest,
        },
      });

      // 4. Actualizar jaba_por_cobrar
      await tx.jabas_por_cobrar.update({
        where: { id_jaba_cobrar },
        data: {
          cantidad_recuperada: nuevaRecuperada,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        },
      });

      return recuperacion;
    });
  }

  // ==================== DEVOLUCIONES (de empresa a emisor) ====================

  async registrarDevolucionEmisor(data: CreateDevolucionEmisorDto, empresaId: number, usuarioId?: number) {
    const { id_jaba_pagar, cantidad, id_usuario_responsable, ...rest } = data;

    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener registro de jaba por pagar
      const jabaPagar = await tx.jabas_por_pagar.findFirst({
        where: { id_jaba_pagar, id_empresa: empresaId },
      });
      if (!jabaPagar) throw new NotFoundException('Jaba por pagar no encontrada');
      if (cantidad > jabaPagar.saldo_pendiente) {
        throw new BadRequestException(
          `La cantidad (${cantidad}) excede el saldo pendiente (${jabaPagar.saldo_pendiente})`
        );
      }

      // 2. Calcular nuevo saldo
      const nuevoSaldo = jabaPagar.saldo_pendiente - cantidad;
      const nuevaPagada = jabaPagar.cantidad_pagada + cantidad;
      const nuevoEstado = nuevoSaldo === 0 ? 'completado' : 'parcial';

      // 3. Crear devolución
      const devolucion = await tx.devoluciones_jabas_emisor.create({
        data: {
          id_empresa: empresaId,
          id_jaba_pagar,
          cantidad,
          saldo_resultante: nuevoSaldo,
          id_usuario_responsable: id_usuario_responsable ?? usuarioId,
          ...rest,
        },
      });

      // 4. Actualizar jaba_por_pagar
      await tx.jabas_por_pagar.update({
        where: { id_jaba_pagar },
        data: {
          cantidad_pagada: nuevaPagada,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        },
      });

      return devolucion;
    });
  }

  // ==================== MOVIMIENTOS HISTÓRICOS ====================

  async listarRecuperacionesPorJabaCobrar(idJabaCobrar: number, empresaId: number) {
    const jaba = await this.prisma.jabas_por_cobrar.findFirst({
      where: { id_jaba_cobrar: idJabaCobrar, id_empresa: empresaId },
    });
    if (!jaba) throw new NotFoundException('Jaba por cobrar no encontrada');

    return this.prisma.recuperaciones_jabas.findMany({
      where: { id_jaba_cobrar: idJabaCobrar },
      include: {
        usuarios: { select: { nombres: true, apellidos: true } },
      },
      orderBy: { fecha_recuperacion: 'desc' },
    });
  }

  async listarDevolucionesPorJabaPagar(idJabaPagar: number, empresaId: number) {
    const jaba = await this.prisma.jabas_por_pagar.findFirst({
      where: { id_jaba_pagar: idJabaPagar, id_empresa: empresaId },
    });
    if (!jaba) throw new NotFoundException('Jaba por pagar no encontrada');

    return this.prisma.devoluciones_jabas_emisor.findMany({
      where: { id_jaba_pagar: idJabaPagar },
      include: {
        usuarios: { select: { nombres: true, apellidos: true } },
      },
      orderBy: { fecha_devolucion: 'desc' },
    });
  }
}