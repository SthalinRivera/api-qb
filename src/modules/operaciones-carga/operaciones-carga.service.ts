// operaciones-carga.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateOperacionCargaDto } from './dto/create-operaciones-carga.dto';
import { UpdateOperacionCargaDto } from './dto/update-operaciones-carga.dto';
import { QueryOperacionesCargaDto } from './dto/query-operaciones-carga.dto';
import {
  cargaEditable,
  operacionCancelada,
  resumenFlujo,
} from './flujo-operacion';
import { GuiasOperativasService } from '../guias-operativas/guias-operativas.service';

@Injectable()
export class OperacionesCargaService {
  constructor(
    private prisma: PrismaService,
    private guiasService: GuiasOperativasService,
  ) {}

  async create(createDto: CreateOperacionCargaDto) {
    if (createDto.estado && createDto.estado !== 'pendiente')
      throw new BadRequestException(
        'Una operación nueva debe comenzar pendiente.',
      );
    // Verificar que todas las relaciones (sede, camión, usuarios) existan en la base de datos
    await this.validateRelations(createDto);

    return this.prisma.operaciones_carga.create({
      data: {
        id_empresa: 1, // TODO: Reemplazar con el id_empresa del token JWT del usuario autenticado
        id_sede_origen: createDto.id_sede_origen,
        id_sede_destino: createDto.id_sede_destino,
        id_camion: createDto.id_camion,
        id_encargado_carga: createDto.id_encargado_carga,
        id_repartidor_asignado: createDto.id_repartidor_asignado,
        fecha_carga: new Date(createDto.fecha_carga), // Convierte string a Date
        hora_carga: createDto.hora_carga
          ? new Date(`1970-01-01T${createDto.hora_carga}`)
          : undefined, // Convierte hora (HH:MM) a Date
        estado: createDto.estado ?? 'pendiente', // Por defecto 'pendiente'
        observaciones: createDto.observaciones,
      },
      include: {
        camiones: true,
        sedes_operaciones_carga_id_sede_origenTosedes: true,
        sedes_operaciones_carga_id_sede_destinoTosedes: true,
        usuarios_operaciones_carga_id_encargado_cargaTousuarios: true,
        usuarios_operaciones_carga_id_repartidor_asignadoTousuarios: true,
      },
    });
  }

  async findAll(query: QueryOperacionesCargaDto) {
    const { estado, fecha } = query;
    const where: any = {};

    if (estado) where.estado = estado;
    if (fecha) {
      // Filtro por fecha: desde la fecha indicada hasta el día siguiente (rango)
      const startDate = new Date(fecha);
      const endDate = new Date(fecha);
      endDate.setDate(endDate.getDate() + 1);
      where.fecha_carga = { gte: startDate, lt: endDate };
    }

    return this.prisma.operaciones_carga.findMany({
      where,
      orderBy: { fecha_carga: 'desc' }, // Más recientes primero
      include: {
        camiones: true,
        sedes_operaciones_carga_id_sede_origenTosedes: true,
        sedes_operaciones_carga_id_sede_destinoTosedes: true,
        usuarios_operaciones_carga_id_encargado_cargaTousuarios: true,
        usuarios_operaciones_carga_id_repartidor_asignadoTousuarios: true,
      },
    });
  }

  async findOne(id: number) {
    const operacion = await this.prisma.operaciones_carga.findUnique({
      where: { id_operacion: id },
      include: {
        camiones: true,
        sedes_operaciones_carga_id_sede_origenTosedes: true,
        sedes_operaciones_carga_id_sede_destinoTosedes: true,
        usuarios_operaciones_carga_id_encargado_cargaTousuarios: true,
        usuarios_operaciones_carga_id_repartidor_asignadoTousuarios: true,
        detalle_carga: {
          include: {
            detalle_carga_calidades: { include: { calidades: true } },
            items_reparto: {
              include: {
                clientes: true,
                puestos: true,
                entregas: true,
                guias_operativas: true,
              },
            },
            frutas: true,
            variedades: true,
            tipos_jaba: true,
            clientes: true,
          },
        },
        incidencias: true,
      },
    });

    if (!operacion) {
      throw new NotFoundException(`Operación con ID ${id} no encontrada`);
    }
    return { ...operacion, flujo: resumenFlujo(operacion.detalle_carga) };
  }

  async update(id: number, updateDto: UpdateOperacionCargaDto) {
    const operacion = await this.findOne(id);
    if (!cargaEditable(operacion.estado)) {
      throw new BadRequestException(
        'No se puede modificar una operación en tránsito o cancelada',
      );
    }

    if (Object.keys(updateDto).length === 0) {
      throw new BadRequestException('No se enviaron datos para actualizar');
    }

    if (updateDto.estado && updateDto.estado !== operacion.estado)
      throw new BadRequestException(
        'Usa la acción de confirmar carga o cancelar para cambiar de etapa.',
      );
    await this.validateRelations(updateDto, id);

    return this.prisma.operaciones_carga.update({
      where: { id_operacion: id },
      data: {
        id_sede_origen: updateDto.id_sede_origen,
        id_sede_destino: updateDto.id_sede_destino,
        id_camion: updateDto.id_camion,
        id_encargado_carga: updateDto.id_encargado_carga,
        id_repartidor_asignado: updateDto.id_repartidor_asignado,
        fecha_carga: updateDto.fecha_carga
          ? new Date(updateDto.fecha_carga)
          : undefined,
        hora_carga: updateDto.hora_carga
          ? new Date(`1970-01-01T${updateDto.hora_carga}`)
          : undefined,
        estado: updateDto.estado,
        observaciones: updateDto.observaciones,
      },
      include: {
        camiones: true,
        sedes_operaciones_carga_id_sede_origenTosedes: true,
        sedes_operaciones_carga_id_sede_destinoTosedes: true,
        usuarios_operaciones_carga_id_encargado_cargaTousuarios: true,
        usuarios_operaciones_carga_id_repartidor_asignadoTousuarios: true,
      },
    });
  }

  async remove(id: number) {
    const operacion = await this.findOne(id);
    if (!cargaEditable(operacion.estado)) {
      throw new BadRequestException(
        'No se puede cancelar una operación en tránsito',
      );
    }
    return this.prisma.operaciones_carga.update({
      where: { id_operacion: id },
      data: { estado: 'cancelado' },
    });
  }

  async changeState(id: number, newState: string) {
    if (newState === 'repartiendo' || newState === 'en_transito')
      return this.finalizar(id);
    if (newState === 'cancelado' || newState === 'cancelada')
      return this.remove(id);
    throw new BadRequestException(
      'Usa los pasos de la operación para avanzar. El estado se calcula a partir de la carga y sus entregas.',
    );
  }

  async finalizar(operacionId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${BigInt(operacionId)} FOR UPDATE`;
      const operacion = await tx.operaciones_carga.findUnique({
        where: { id_operacion: operacionId },
        include: {
          detalle_carga: {
            include: {
              detalle_carga_calidades: true,
              items_reparto: { include: { entregas: true } },
            },
          },
        },
      });
      if (!operacion) throw new NotFoundException('Operación no encontrada.');
      if (!cargaEditable(operacion.estado))
        throw new BadRequestException(
          'Esta carga ya fue confirmada o está cancelada.',
        );
      const flujo = resumenFlujo(operacion.detalle_carga);
      if (!flujo.listaParaEntregar)
        throw new BadRequestException(flujo.pendientes.join(' '));
      return tx.operaciones_carga.update({
        where: { id_operacion: operacionId },
        data: { estado: 'repartiendo' },
      });
    });
  }

  private async validateRelations(dto: any, excludeId?: number) {
    const {
      id_sede_origen,
      id_sede_destino,
      id_camion,
      id_encargado_carga,
      id_repartidor_asignado,
    } = dto;

    if (id_sede_origen) {
      const exists = await this.prisma.sedes.findUnique({
        where: { id_sede: id_sede_origen },
      });
      if (!exists)
        throw new BadRequestException(
          `Sede origen con ID ${id_sede_origen} no existe`,
        );
    }
    if (id_sede_destino) {
      const exists = await this.prisma.sedes.findUnique({
        where: { id_sede: id_sede_destino },
      });
      if (!exists)
        throw new BadRequestException(
          `Sede destino con ID ${id_sede_destino} no existe`,
        );
    }
    if (id_camion) {
      const exists = await this.prisma.camiones.findUnique({
        where: { id_camion },
      });
      if (!exists)
        throw new BadRequestException(`Camión con ID ${id_camion} no existe`);
    }
    if (id_encargado_carga) {
      const exists = await this.prisma.usuarios.findUnique({
        where: { id_usuario: id_encargado_carga },
      });
      if (!exists)
        throw new BadRequestException(
          `Usuario (encargado) con ID ${id_encargado_carga} no existe`,
        );
    }
    if (id_repartidor_asignado) {
      const exists = await this.prisma.usuarios.findUnique({
        where: { id_usuario: id_repartidor_asignado },
      });
      if (!exists)
        throw new BadRequestException(
          `Usuario (repartidor) con ID ${id_repartidor_asignado} no existe`,
        );
    }
  }

  async findDetallesRepartoPendientes(operacionId: number) {
    // 1. Obtener todos los detalles de reparto con calidades e items asociados
    const detalles = await this.prisma.detalle_carga.findMany({
      where: {
        id_operacion: operacionId,
        es_reparto: true,
        operaciones_carga: { estado: { in: ['pendiente', 'en_curso'] } },
        detalle_carga_calidades: { some: {} }, // al menos una calidad
      },
      include: {
        clientes: true, // emisor
        detalle_carga_calidades: {
          include: { calidades: true },
        },
        items_reparto: {
          include: {
            items_reparto_detalle: true, // para saber cuánto se ha asignado de cada calidad
            clientes: true,
            puestos: true,
          },
        },
      },
    });

    // 2. Filtrar aquellos que tienen calidades sin asignar completamente
    const pendientes = detalles.filter((detalle) => {
      // Si no tiene items, está pendiente completamente
      if (detalle.items_reparto.length === 0) return true;

      // Recorrer cada calidad y verificar si está completamente asignada
      const calidades = detalle.detalle_carga_calidades;
      for (const calidad of calidades) {
        // Sumar todas las cantidades asignadas de esta calidad en todos los items_reparto_detalle
        let totalAsignado = 0;
        for (const item of detalle.items_reparto) {
          for (const det of item.items_reparto_detalle || []) {
            if (
              det.id_detalle_carga_calidad === calidad.id_detalle_carga_calidad
            ) {
              totalAsignado += det.cantidad;
            }
          }
        }
        // Si la suma asignada es menor que la cantidad total de la calidad, está pendiente
        if (totalAsignado < calidad.cantidad) {
          return true;
        }
      }
      // Si todas las calidades están completamente asignadas, no está pendiente
      return false;
    });

    return pendientes;
  }

  async findAllDetallesRepartoPendientes() {
    // Obtener todos los detalles de reparto con calidades (sin filtrar por items_reparto)
    const detalles = await this.prisma.detalle_carga.findMany({
      where: {
        id_empresa: 1,
        es_reparto: true,
        operaciones_carga: { estado: { in: ['pendiente', 'en_curso'] } },
        detalle_carga_calidades: { some: {} },
      },
      include: {
        clientes: true,
        detalle_carga_calidades: {
          include: { calidades: true },
        },
        items_reparto: {
          include: {
            items_reparto_detalle: true,
          },
        },
        operaciones_carga: {
          include: {
            camiones: true,
            sedes_operaciones_carga_id_sede_origenTosedes: true,
          },
        },
      },
    });

    // Filtrar y enriquecer con saldo por calidad
    const pendientesConSaldo = detalles
      .map((detalle) => {
        // Para cada calidad, calcular cuánto ya está asignado
        const calidadesConSaldo = detalle.detalle_carga_calidades.map(
          (calidad) => {
            // Sumar cantidades ya asignadas en items_reparto_detalle para esta calidad
            let asignado = 0;
            for (const item of detalle.items_reparto) {
              for (const det of item.items_reparto_detalle || []) {
                if (
                  det.id_detalle_carga_calidad ===
                  calidad.id_detalle_carga_calidad
                ) {
                  asignado += det.cantidad;
                }
              }
            }
            const saldo = calidad.cantidad - asignado;
            return {
              ...calidad,
              cantidad_asignada: asignado,
              saldo: saldo,
            };
          },
        );

        // Filtrar calidades con saldo > 0 (aún pendientes)
        const calidadesPendientes = calidadesConSaldo.filter(
          (c) => c.saldo > 0,
        );

        // Si no quedan calidades pendientes, el detalle no debe aparecer
        if (calidadesPendientes.length === 0) return null;

        // Reemplazar las calidades originales por las enriquecidas
        return {
          ...detalle,
          detalle_carga_calidades: calidadesPendientes,
          // También podemos agregar un campo de resumen para el frontend
          _resumen: {
            total_calidades: detalle.detalle_carga_calidades.length,
            pendientes: calidadesPendientes.length,
            completadas:
              detalle.detalle_carga_calidades.length -
              calidadesPendientes.length,
          },
        };
      })
      .filter((d) => d !== null); // eliminar detalles sin calidades pendientes

    return pendientesConSaldo;
  }

  async generarGuias(operacionId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${BigInt(operacionId)} FOR UPDATE`;
      const operacion = await tx.operaciones_carga.findUnique({
        where: { id_operacion: operacionId },
      });
      if (!operacion) throw new NotFoundException('Operación no encontrada.');
      if (
        cargaEditable(operacion.estado) ||
        operacionCancelada(operacion.estado)
      )
        throw new BadRequestException('Primero completa y confirma la carga.');
      const items = await tx.items_reparto.findMany({
        where: { detalle_carga: { id_operacion: operacionId } },
        include: { guias_operativas: true, entregas: true },
      });
      if (
        !items.length ||
        items.some(
          (item) =>
            !item.entregas.some((e) => e.estado_entrega !== 'pendiente'),
        )
      )
        throw new BadRequestException(
          'Registra las entregas antes de consultar las guías.',
        );
      // Una guía corresponde a un destino concreto. No se mezclan clientes por puesto.
      const guias: (typeof items)[number]['guias_operativas'] = [];
      for (const item of items) {
        const existente = item.guias_operativas.find(
          (g) => g.estado !== 'anulada' && g.estado !== 'reemplazada',
        );
        if (existente) {
          guias.push(existente);
          continue;
        }
        guias.push(
          await tx.guias_operativas.create({
            data: {
              id_empresa: operacion.id_empresa,
              id_item_reparto: item.id_item_reparto,
              id_puesto: item.id_puesto,
              numero_guia:
                'G-' +
                operacionId +
                '-I' +
                item.id_item_reparto +
                '-V' +
                (item.guias_operativas.length + 1),
              fecha_emision: new Date(),
              id_repartidor: operacion.id_repartidor_asignado,
              estado: 'emitida',
            },
          }),
        );
      }
      return guias;
    });
  }
}
