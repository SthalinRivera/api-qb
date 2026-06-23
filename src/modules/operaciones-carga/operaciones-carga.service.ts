// operaciones-carga.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateOperacionCargaDto } from './dto/create-operaciones-carga.dto';
import { UpdateOperacionCargaDto } from './dto/update-operaciones-carga.dto';
import { QueryOperacionesCargaDto } from './dto/query-operaciones-carga.dto';
import { GuiasOperativasService } from '../guias-operativas/guias-operativas.service';

@Injectable()
export class OperacionesCargaService {
  constructor(
    private prisma: PrismaService,
    private guiasService: GuiasOperativasService,
  ) { }


  async create(createDto: CreateOperacionCargaDto) {
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
        hora_carga: createDto.hora_carga ? new Date(`1970-01-01T${createDto.hora_carga}`) : undefined, // Convierte hora (HH:MM) a Date
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
    return operacion;
  }


  async update(id: number, updateDto: UpdateOperacionCargaDto) {
    await this.findOne(id); // Asegura que la operación existe

    if (Object.keys(updateDto).length === 0) {
      throw new BadRequestException('No se enviaron datos para actualizar');
    }

    // Validar que las nuevas relaciones existan (si se están cambiando)
    await this.validateRelations(updateDto, id);

    return this.prisma.operaciones_carga.update({
      where: { id_operacion: id },
      data: {
        id_sede_origen: updateDto.id_sede_origen,
        id_sede_destino: updateDto.id_sede_destino,
        id_camion: updateDto.id_camion,
        id_encargado_carga: updateDto.id_encargado_carga,
        id_repartidor_asignado: updateDto.id_repartidor_asignado,
        fecha_carga: updateDto.fecha_carga ? new Date(updateDto.fecha_carga) : undefined,
        hora_carga: updateDto.hora_carga ? new Date(`1970-01-01T${updateDto.hora_carga}`) : undefined,
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
    await this.findOne(id);
    return this.prisma.operaciones_carga.update({
      where: { id_operacion: id },
      data: { estado: 'cancelada' },
    });
  }


  async changeState(id: number, newState: string) {
    const allowedStates = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
    if (!allowedStates.includes(newState)) {
      throw new BadRequestException(`Estado no válido: ${newState}`);
    }
    await this.findOne(id);
    return this.prisma.operaciones_carga.update({
      where: { id_operacion: id },
      data: { estado: newState },
    });
  }

  private async validateRelations(dto: any, excludeId?: number) {
    const { id_sede_origen, id_sede_destino, id_camion, id_encargado_carga, id_repartidor_asignado } = dto;

    if (id_sede_origen) {
      const exists = await this.prisma.sedes.findUnique({ where: { id_sede: id_sede_origen } });
      if (!exists) throw new BadRequestException(`Sede origen con ID ${id_sede_origen} no existe`);
    }
    if (id_sede_destino) {
      const exists = await this.prisma.sedes.findUnique({ where: { id_sede: id_sede_destino } });
      if (!exists) throw new BadRequestException(`Sede destino con ID ${id_sede_destino} no existe`);
    }
    if (id_camion) {
      const exists = await this.prisma.camiones.findUnique({ where: { id_camion } });
      if (!exists) throw new BadRequestException(`Camión con ID ${id_camion} no existe`);
    }
    if (id_encargado_carga) {
      const exists = await this.prisma.usuarios.findUnique({ where: { id_usuario: id_encargado_carga } });
      if (!exists) throw new BadRequestException(`Usuario (encargado) con ID ${id_encargado_carga} no existe`);
    }
    if (id_repartidor_asignado) {
      const exists = await this.prisma.usuarios.findUnique({ where: { id_usuario: id_repartidor_asignado } });
      if (!exists) throw new BadRequestException(`Usuario (repartidor) con ID ${id_repartidor_asignado} no existe`);
    }
  }



  async findDetallesRepartoPendientes(operacionId: number) {
    // 1. Obtener todos los detalles de reparto con calidades e items asociados
    const detalles = await this.prisma.detalle_carga.findMany({
      where: {
        id_operacion: operacionId,
        es_reparto: true,
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
            if (det.id_detalle_carga_calidad === calidad.id_detalle_carga_calidad) {
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
        const calidadesConSaldo = detalle.detalle_carga_calidades.map((calidad) => {
          // Sumar cantidades ya asignadas en items_reparto_detalle para esta calidad
          let asignado = 0;
          for (const item of detalle.items_reparto) {
            for (const det of item.items_reparto_detalle || []) {
              if (det.id_detalle_carga_calidad === calidad.id_detalle_carga_calidad) {
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
        });

        // Filtrar calidades con saldo > 0 (aún pendientes)
        const calidadesPendientes = calidadesConSaldo.filter((c) => c.saldo > 0);

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
            completadas: detalle.detalle_carga_calidades.length - calidadesPendientes.length,
          },
        };
      })
      .filter((d) => d !== null); // eliminar detalles sin calidades pendientes

    return pendientesConSaldo;
  }

  async generarGuias(operacionId: number) {
    // 1. Obtener operación
    const operacion = await this.prisma.operaciones_carga.findUnique({
      where: { id_operacion: operacionId },
      select: { id_repartidor_asignado: true, estado: true },
    });
    if (!operacion) {
      throw new NotFoundException(`Operación con ID ${operacionId} no encontrada`);
    }

    // 2. Obtener todos los items sin guía con sus puestos
    const itemsSinGuia = await this.prisma.items_reparto.findMany({
      where: {
        detalle_carga: { id_operacion: operacionId },
        guias_operativas: { none: {} },
      },
      include: {
        puestos: true,
        clientes: true,
        detalle_carga: true,
        items_reparto_detalle: {
          include: {
            detalle_carga_calidades: {
              include: { calidades: true }
            }
          }
        }
      },
    });

    if (itemsSinGuia.length === 0) {
      throw new BadRequestException('No hay items pendientes de guía');
    }

    // 3. Agrupar por puesto (usando Number() para convertir bigint)
    const gruposPorPuesto = new Map<number, typeof itemsSinGuia>();
    for (const item of itemsSinGuia) {
      const key = Number(item.id_puesto);
      if (!gruposPorPuesto.has(key)) {
        gruposPorPuesto.set(key, []);
      }
      gruposPorPuesto.get(key)!.push(item);
    }

    // 4. Generar UNA guía por puesto (no una por item)
    const guiasCreadas: any[] = [];
    let contador = 1;

    for (const [puestoId, items] of gruposPorPuesto) {
      const puesto = items[0].puestos;
      const numeroGuia = `G-${operacionId}-P${puesto?.numero_puesto || 'SIN'}-${contador++}`;

      // Crear la guía y asociar TODOS los items de este puesto
      // Para mantener compatibilidad con el modelo actual, creamos una guía por el primer item,
      // pero luego actualizamos la relación con todos los items (si el modelo lo soporta)
      // O mejor: creamos la guía y luego vinculamos todos los items a ella.
      // operaciones-carga.service.ts
      const nuevaGuia = await this.prisma.guias_operativas.create({
        data: {
          id_empresa: 1,
          numero_guia: numeroGuia,
          fecha_emision: new Date(),
          id_repartidor: operacion.id_repartidor_asignado ? Number(operacion.id_repartidor_asignado) : undefined,
          estado: 'emitida',
          observaciones: `Guía para puesto ${puesto?.numero_puesto} (${items.length} items)`,
          id_item_reparto: Number(items[0].id_item_reparto),
          id_puesto: Number(puestoId), // 🔹 Asignar el puesto
        },
      });

      // 🔹 Si tu modelo soporta múltiples items por guía, aquí deberías vincularlos todos.
      // Como el modelo actual solo tiene un id_item_reparto, esta es la solución temporal.
      // Para una solución completa, necesitas modificar el modelo para soportar muchos a muchos.

      guiasCreadas.push(nuevaGuia);
    }

    // 5. Actualizar estado de la operación
    if (operacion.estado === 'en_curso') {
      await this.prisma.operaciones_carga.update({
        where: { id_operacion: operacionId },
        data: { estado: 'repartiendo' },
      });
    }

    return guiasCreadas;
  }
}
