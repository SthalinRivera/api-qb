import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateRecuperacionDto } from './dto/create-recuperacion.dto';
import { CreateDevolucionEmisorDto } from './dto/create-devolucion-emisor.dto';
import { QueryParamsDto } from './dto/query-params.dto';

@Injectable()
export class JabasService {
  constructor(private prisma: PrismaService) { }

  private parseFecha(fecha: string | Date | undefined, nombreCampo: string): Date {
    if (!fecha) {
      throw new BadRequestException(`${nombreCampo} es obligatorio`);
    }

    const fechaParsed = new Date(fecha);
    if (Number.isNaN(fechaParsed.getTime())) {
      throw new BadRequestException(`Formato inválido para ${nombreCampo}`);
    }

    return fechaParsed;
  }

  private async registrarLog(
    client: any,
    accion: string,
    tabla_afectada: string,
    id_registro: number | bigint | null,
    datos_anteriores: any,
    datos_nuevos: any,
    empresaId?: number,
    usuarioId?: number,
  ) {
    await client.logs_actividad.create({
      data: {
        id_empresa: empresaId ?? null,
        id_usuario: usuarioId ?? null,
        accion,
        tabla_afectada,
        id_registro,
        datos_anteriores,
        datos_nuevos,
      },
    });
  }

  // ==================== JABAS POR PAGAR ====================

  async listarJabasPorPagar(params: QueryParamsDto, empresaId: number, usuarioId?: number, roles?: string[]) {
    const { id_cliente, estado, fecha_desde, fecha_hasta, id_tipo_jaba } = params;

    const where: any = {
      id_empresa: empresaId,
      ...(id_cliente && { id_cliente_emisor: id_cliente }),
      ...(estado && { estado }),
      ...(fecha_desde && { fecha_origen: { gte: new Date(fecha_desde) } }),
      ...(fecha_hasta && { fecha_origen: { lte: new Date(fecha_hasta) } }),
      ...(id_tipo_jaba && { id_tipo_jaba }),
    };

    // Filtrado por empresa ya aplicado arriba. No existe id_cliente en usuarios.

    return this.prisma.jabas_por_pagar.findMany({
      where,
      include: {
        clientes: true,
        tipos_jaba: true,
        entregas: {
          include: {
            guias_operativas: true,
            items_reparto: {
              include: {
                detalle_carga: {
                  include: {
                    operaciones_carga: true,
                    frutas: true,
                    variedades: true,
                  },
                },
              },
            },
          },
        },
        devoluciones_jabas_emisor: {
          orderBy: { fecha_devolucion: 'desc' },
        },
      },
      orderBy: { fecha_origen: 'desc' },
    });
  }

  async obtenerJabaPagar(id: number, empresaId: number, usuarioId?: number, roles?: string[]) {
    const where: any = { id_jaba_pagar: id, id_empresa: empresaId };

    const registro = await this.prisma.jabas_por_pagar.findFirst({
      where,
      include: {
        clientes: true,
        tipos_jaba: true,
        entregas: {
          include: {
            guias_operativas: true,
            items_reparto: {
              include: {
                detalle_carga: {
                  include: {
                    operaciones_carga: true,
                    frutas: true,
                    variedades: true,
                  },
                },
              },
            },
          },
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

  async listarJabasPorCobrar(params: QueryParamsDto, empresaId: number, usuarioId?: number, roles?: string[]) {
    const { id_cliente, estado, fecha_desde, fecha_hasta, id_tipo_jaba } = params;

    const where: any = {
      id_empresa: empresaId,
      ...(estado && { estado }),
      ...(fecha_desde && { fecha_origen: { gte: new Date(fecha_desde) } }),
      ...(fecha_hasta && { fecha_origen: { lte: new Date(fecha_hasta) } }),
      ...(id_tipo_jaba && { id_tipo_jaba }),
    };

    // Filtro por cliente receptor a través de la entrega -> items_reparto
    if (id_cliente) {
      where.entregas = {
        items_reparto: {
          id_cliente_receptor: id_cliente,
        },
      };
    }

    // Filtrado por empresa ya aplicado arriba. No existe id_cliente en usuarios.

    return this.prisma.jabas_por_cobrar.findMany({
      where,
      include: {
        tipos_jaba: true,
        entregas: {
          include: {
            guias_operativas: true,
            items_reparto: {
              include: {
                clientes: true,    // receptor
                puestos: true,
                detalle_carga: true,
              },
            },
          },
        },
        recuperaciones_jabas: {
          orderBy: { fecha_recuperacion: 'desc' },
        },
      },
      orderBy: { fecha_origen: 'desc' },
    });
  }

  async obtenerJabaCobrar(id: number, empresaId: number, usuarioId?: number, roles?: string[]) {
    const where: any = { id_jaba_cobrar: id, id_empresa: empresaId };

    const registro = await this.prisma.jabas_por_cobrar.findFirst({
      where,
      include: {
        tipos_jaba: true,
        entregas: {
          include: {
            guias_operativas: true,
            items_reparto: {
              include: {
                clientes: true,
                puestos: true,
                detalle_carga: true,
              },
            },
          },
        },
        recuperaciones_jabas: {
          orderBy: { fecha_recuperacion: 'desc' },
        },
      },
    });
    if (!registro) throw new NotFoundException('Registro no encontrado');
    return registro;
  }

  // ==================== RECUPERACIONES (receptor → empresa) ====================

  async cambiarEstadoPorCobrar(id: number, empresaId: number, estado: string, usuarioId?: number, roles?: string[]) {
    // Solo admin puede cambiar estado
    if (!roles?.includes('administrador') && !roles?.includes('admin')) {
      throw new BadRequestException('No tiene permisos para realizar esta acción');
    }

    const registro = await this.prisma.jabas_por_cobrar.findFirst({ where: { id_jaba_cobrar: id, id_empresa: empresaId } });
    if (!registro) throw new NotFoundException('Registro no encontrado');

    const actualizado = await this.prisma.jabas_por_cobrar.update({
      where: { id_jaba_cobrar: id },
      data: { estado },
    });

    await this.registrarLog(this.prisma, 'estado_jaba_cobrar_actualizado', 'jabas_por_cobrar', id, registro, actualizado, empresaId, usuarioId);
    return actualizado;
  }

  async cambiarEstadoPorPagar(id: number, empresaId: number, estado: string, usuarioId?: number, roles?: string[]) {
    // Solo admin puede cambiar estado
    if (!roles?.includes('administrador') && !roles?.includes('admin')) {
      throw new BadRequestException('No tiene permisos para realizar esta acción');
    }

    const registro = await this.prisma.jabas_por_pagar.findFirst({ where: { id_jaba_pagar: id, id_empresa: empresaId } });
    if (!registro) throw new NotFoundException('Registro no encontrado');

    const actualizado = await this.prisma.jabas_por_pagar.update({
      where: { id_jaba_pagar: id },
      data: { estado },
    });

    await this.registrarLog(this.prisma, 'estado_jaba_pagar_actualizado', 'jabas_por_pagar', id, registro, actualizado, empresaId, usuarioId);
    return actualizado;
  }

  async registrarRecuperacion(data: CreateRecuperacionDto, empresaId: number, usuarioId?: number, roles?: string[]) {
    // Solo admin puede registrar recuperaciones
    if (!roles?.includes('administrador') && !roles?.includes('admin')) {
      throw new BadRequestException('No tiene permisos para realizar esta acción');
    }

    const { id_jaba_cobrar, cantidad, id_usuario_responsable, fecha_recuperacion, ...rest } = data;
    const fechaRecuperacion = this.parseFecha(fecha_recuperacion, 'fecha_recuperacion');

    return this.prisma.$transaction(async (tx) => {
      const jabaCobrar = await tx.jabas_por_cobrar.findFirst({
        where: { id_jaba_cobrar, id_empresa: empresaId },
      });
      if (!jabaCobrar) throw new NotFoundException('Jaba por cobrar no encontrada');
      if (cantidad > jabaCobrar.saldo_pendiente) {
        throw new BadRequestException(
          `La cantidad (${cantidad}) excede el saldo pendiente (${jabaCobrar.saldo_pendiente})`
        );
      }

      const nuevoSaldo = jabaCobrar.saldo_pendiente - cantidad;
      const nuevaRecuperada = jabaCobrar.cantidad_recuperada + cantidad;
      const nuevoEstado = nuevoSaldo === 0 ? 'completado' : 'parcial';

      const recuperacion = await tx.recuperaciones_jabas.create({
        data: {
          id_empresa: empresaId,
          id_jaba_cobrar,
          cantidad,
          id_usuario_responsable: id_usuario_responsable ?? usuarioId,
          fecha_recuperacion: fechaRecuperacion,
          ...rest,
        },
      });

      const jabaActualizada = await tx.jabas_por_cobrar.update({
        where: { id_jaba_cobrar },
        data: {
          cantidad_recuperada: nuevaRecuperada,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        },
      });

      await this.registrarLog(
        tx,
        'recuperacion_registrada',
        'recuperaciones_jabas',
        recuperacion.id_recuperacion,
        jabaCobrar,
        {
          recuperacion,
          jaba_por_cobrar: jabaActualizada,
        },
        empresaId,
        usuarioId,
      );

      return recuperacion;
    });
  }

  // ==================== DEVOLUCIONES (empresa → emisor) ====================

  async registrarDevolucionEmisor(data: CreateDevolucionEmisorDto, empresaId: number, usuarioId?: number, roles?: string[]) {
    // Solo admin puede registrar devoluciones
    if (!roles?.includes('administrador') && !roles?.includes('admin')) {
      throw new BadRequestException('No tiene permisos para realizar esta acción');
    }

    const { id_jaba_pagar, cantidad, id_usuario_responsable, fecha_devolucion, ...rest } = data;
    const fechaDevolucion = this.parseFecha(fecha_devolucion, 'fecha_devolucion');

    return this.prisma.$transaction(async (tx) => {
      const jabaPagar = await tx.jabas_por_pagar.findFirst({
        where: { id_jaba_pagar, id_empresa: empresaId },
      });
      if (!jabaPagar) throw new NotFoundException('Jaba por pagar no encontrada');
      if (cantidad > jabaPagar.saldo_pendiente) {
        throw new BadRequestException(
          `La cantidad (${cantidad}) excede el saldo pendiente (${jabaPagar.saldo_pendiente})`
        );
      }

      const nuevoSaldo = jabaPagar.saldo_pendiente - cantidad;
      const nuevaPagada = jabaPagar.cantidad_pagada + cantidad;
      const nuevoEstado = nuevoSaldo === 0 ? 'completado' : 'parcial';

      const devolucion = await tx.devoluciones_jabas_emisor.create({
        data: {
          id_empresa: empresaId,
          id_jaba_pagar,
          cantidad,
          id_usuario_responsable: id_usuario_responsable ?? usuarioId,
          fecha_devolucion: fechaDevolucion,
          ...rest,
        },
      });

      const jabaActualizada = await tx.jabas_por_pagar.update({
        where: { id_jaba_pagar },
        data: {
          cantidad_pagada: nuevaPagada,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoEstado,
        },
      });

      await this.registrarLog(
        tx,
        'devolucion_emisor_registrada',
        'devoluciones_jabas_emisor',
        devolucion.id_devolucion,
        jabaPagar,
        {
          devolucion,
          jaba_por_pagar: jabaActualizada,
        },
        empresaId,
        usuarioId,
      );

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
