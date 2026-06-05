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
    private guiasService: GuiasOperativasService, // 👈 Inyecta el servicio de guías
  ) { }

  /**
   * Crea una nueva operación de carga.
   * @param createDto - Datos de la operación (fecha, camión, sedes, etc.)
   * @returns Operación creada con sus relaciones (camión, sedes, usuarios)
   */
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

  /**
   * Lista todas las operaciones de carga con filtros opcionales (estado, fecha).
   * @param query - Objeto con posibles filtros: estado, fecha
   * @returns Lista de operaciones ordenadas por fecha descendente
   */
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

  /**
   * Obtiene una operación por su ID, incluyendo detalles de carga, frutas, variedades, etc.
   * @param id - ID de la operación
   * @throws NotFoundException si no existe
   */
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

  /**
   * Actualiza los datos de una operación.
   * @param id - ID de la operación
   * @param updateDto - Datos a modificar (todos opcionales)
   * @throws BadRequestException si no se envía ningún campo
   */
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

  /**
   * Cancela una operación (soft delete) cambiando su estado a 'cancelada'.
   * @param id - ID de la operación
   */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.operaciones_carga.update({
      where: { id_operacion: id },
      data: { estado: 'cancelada' },
    });
  }

  /**
   * Cambia el estado de una operación (pendiente, en_proceso, completada, cancelada).
   * @param id - ID de la operación
   * @param newState - Nuevo estado (debe estar en la lista de permitidos)
   */
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

  /**
   * Valida que todas las entidades referenciadas (sedes, camión, usuarios) existan en la base de datos.
   * @param dto - Objeto que puede contener los ids a validar
   * @param excludeId - Parámetro no usado (se mantiene por compatibilidad)
   */
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

  /**
   * Genera guías operativas para todos los items de reparto de una operación
   * que aún no tengan una guía asociada.
   * @param operacionId - ID de la operación de carga
   * @returns Lista de guías creadas
   */
  async generarGuias(operacionId: number) {
    // 1. Verificar operación y obtener datos necesarios
    const operacion = await this.prisma.operaciones_carga.findUnique({
      where: { id_operacion: operacionId },
      select: { id_repartidor_asignado: true, estado: true }, // ✅
    });
    if (!operacion) {
      throw new NotFoundException(`Operación con ID ${operacionId} no encontrada`);
    }

    // 2. Obtener IDs de items de reparto que ya tienen guía
    const guiasExistentes = await this.prisma.guias_operativas.findMany({
      select: { id_item_reparto: true },
    });
    const idsConGuia = guiasExistentes
      .map(g => g.id_item_reparto)
      .filter((id): id is bigint => id !== null);

    // 3. Items sin guía
    const itemsSinGuia = await this.prisma.items_reparto.findMany({
      where: {
        detalle_carga: { id_operacion: operacionId },
        id_item_reparto: { notIn: idsConGuia },
      },
      include: { clientes: true, puestos: true, detalle_carga: true },
    });

    if (itemsSinGuia.length === 0) {
      throw new BadRequestException('No hay items de reparto pendientes de guía');
    }

    const guiasCreadas: Awaited<ReturnType<typeof this.guiasService.create>>[] = [];
    let contador = 1;

    for (const item of itemsSinGuia) {
      const numeroGuia = `G-${operacionId}-${contador++}`;
      const fechaEmision = new Date().toISOString().split('T')[0];

      const nuevaGuia = await this.guiasService.create({
        numero_guia: numeroGuia,
        fecha_emision: fechaEmision,
        id_repartidor: operacion.id_repartidor_asignado ? Number(operacion.id_repartidor_asignado) : undefined,
        observaciones: item.observaciones ?? undefined,
        id_item_reparto: Number(item.id_item_reparto),
        estado: 'emitida',
      });

      guiasCreadas.push(nuevaGuia);
    }

    // 4. Actualizar estado de la operación si estaba 'en_proceso'
    if (operacion.estado === 'en_curso') {
      await this.prisma.operaciones_carga.update({
        where: { id_operacion: operacionId },
        data: { estado: 'repartiendo' },
      });
    }

    return guiasCreadas;
  }
}
