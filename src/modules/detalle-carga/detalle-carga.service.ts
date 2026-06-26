// detalle-carga.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateDetalleCargaDto } from './dto/create-detalle-carga.dto';
import { CreateDetalleCargaForOperacionDto } from './dto/create-detalle-carga-for-operacion.dto';
import { UpdateDetalleCargaDto } from './dto/update-detalle-carga.dto';
import { CreateDetalleCalidadDto } from './dto/create-detalle-calidad.dto';
import { UpdateDetalleCalidadDto } from './dto/update-detalle-calidad.dto';

@Injectable()
export class DetalleCargaService {
  constructor(private prisma: PrismaService) { }

  // detalle-carga.service.ts (fragmento)

  async create(operacionId: number, dto: CreateDetalleCargaForOperacionDto) {
    const operacion = await this.prisma.operaciones_carga.findUnique({
      where: { id_operacion: operacionId },
    });
    if (!operacion) throw new NotFoundException(`Operación con ID ${operacionId} no existe`);

    await this.validateRelations(dto);

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear detalle de carga
      const detalle = await tx.detalle_carga.create({
        data: {
          id_empresa: 1,
          id_operacion: operacionId,
          id_cliente_emisor: dto.id_cliente_emisor,
          id_fruta: dto.id_fruta,
          id_variedad: dto.id_variedad,
          id_tipo_jaba: dto.id_tipo_jaba,
          cantidad_jabas: dto.cantidad_jabas,
          es_reparto: dto.es_reparto ?? false,
          instruccion_reparto: dto.instruccion_reparto,
          observaciones: dto.observaciones,
          requiere_retorno_jabas: dto.requiere_retorno_jabas ?? false,
        },
      });

      let itemReparto: any = null;
      let entrega: any = null;
      // 2. Si requiere retorno -> jabas_por_pagar
      if (detalle.requiere_retorno_jabas) {
        await tx.jabas_por_pagar.create({
          data: {
            id_empresa: 1,
            id_detalle_carga: detalle.id_detalle_carga,
            id_cliente_emisor: detalle.id_cliente_emisor,
            id_tipo_jaba: detalle.id_tipo_jaba,
            fecha_origen: new Date(),
            cantidad_debida: detalle.cantidad_jabas,
            cantidad_pagada: 0,
            saldo_pendiente: detalle.cantidad_jabas,
            estado: 'pendiente',
            observaciones: 'Generado automáticamente al crear el detalle',
          },
        });
      }

      // 3. Si es entrega manual
      if (dto.es_reparto === false) {
        if (!dto.id_cliente_receptor || !dto.id_puesto) {
          throw new BadRequestException('Para entrega manual debe especificar cliente receptor y puesto');
        }

        const relacion = await tx.clientes_puestos.findFirst({
          where: {
            id_cliente: dto.id_cliente_receptor,
            id_puesto: dto.id_puesto,
            fecha_fin: null,
            estado: true,
          },
          select: { seccion: true },
        });
        if (!relacion) {
          throw new BadRequestException(`El cliente receptor no tiene el puesto ${dto.id_puesto} activo.`);
        }

        const seccionFinal = dto.id_seccion ?? relacion.seccion;

        // Crear item de reparto
        itemReparto = await tx.items_reparto.create({
          data: {
            id_empresa: 1,
            id_detalle_carga: detalle.id_detalle_carga,
            id_cliente_receptor: dto.id_cliente_receptor,
            id_puesto: dto.id_puesto,
            cantidad_asignada: detalle.cantidad_jabas,
            seccion: seccionFinal,
            orden_entrega: null,
            observaciones: dto.instruccion_reparto,
          },
          include: { clientes: true, puestos: true },
        });

        // Crear guía operativa
        const guia = await tx.guias_operativas.create({
          data: {
            id_empresa: 1,
            numero_guia: `G-${Date.now()}-${itemReparto.id_item_reparto}`,
            fecha_emision: new Date(),
            id_repartidor: null,
            estado: 'emitida',
            observaciones: 'Guía generada automáticamente para entrega manual',
            id_item_reparto: itemReparto.id_item_reparto,
            id_puesto: dto.id_puesto,
          },
        });

        // Crear entrega
        entrega = await tx.entregas.create({
          data: {
            id_empresa: 1,
            id_guia: guia.id_guia,
            id_item_reparto: itemReparto.id_item_reparto,
            id_entregador: null,
            fecha_entrega: new Date(),
            hora_entrega: null,
            cantidad_entregada: 0,
            cantidad_rechazada: 0,
            estado_entrega: 'pendiente',
            firma_recibido: false,
            nombre_recibe: null,
            observaciones: 'Entrega pendiente generada automáticamente',
          },
        });

        // Si requiere retorno -> jabas_por_cobrar
        if (detalle.requiere_retorno_jabas) {
          await tx.jabas_por_cobrar.create({
            data: {
              id_empresa: 1,
              id_entrega: entrega.id_entrega,
              id_item_reparto: itemReparto.id_item_reparto,
              id_cliente_receptor: dto.id_cliente_receptor,
              id_puesto: dto.id_puesto,
              id_tipo_jaba: detalle.id_tipo_jaba,
              fecha_origen: new Date(),
              cantidad_debida: itemReparto.cantidad_asignada,
              cantidad_recuperada: 0,
              saldo_pendiente: itemReparto.cantidad_asignada,
              estado: 'pendiente',
              seccion: seccionFinal,
              observaciones: 'Generado automáticamente al crear entrega manual',
            },
          });
        }
      }

      // Actualizar estado de operación
      if (operacion.estado === 'pendiente') {
        await tx.operaciones_carga.update({
          where: { id_operacion: operacionId },
          data: { estado: 'en_curso' },
        });
      }

      return {
        ...detalle,
        item_reparto: itemReparto,
        entrega: entrega,
      };
    });
  }

  /**
   * Obtiene todos los detalles de carga de una operación específica.
   * Incluye las relaciones: cliente, fruta, variedad, tipo de jaba y calidades.
   */
  // detalle-carga.service.ts
  async findByOperacion(operacionId: number) {
    const operacion = await this.prisma.operaciones_carga.findUnique({
      where: { id_operacion: operacionId },
    });
    if (!operacion) {
      throw new NotFoundException(`Operación con ID ${operacionId} no existe`);
    }

    return this.prisma.detalle_carga.findMany({
      where: { id_operacion: operacionId },
      include: {
        clientes: true,
        frutas: true,
        variedades: true,
        tipos_jaba: true,
        detalle_carga_calidades: { include: { calidades: true } },
        items_reparto: {                    // 🔥 incluimos el item de reparto
          include: {
            clientes: true,                // para el nombre del cliente receptor
            guias_operativas: true,        // 🔥 la guía asociada (si existe)
          },
        },
      },
      orderBy: { id_detalle_carga: 'asc' },
    });
  }

  /**
   * Obtiene un detalle de carga por su ID, con todas sus relaciones.
   */
  async findOne(id: number) {
    const detalle = await this.prisma.detalle_carga.findUnique({
      where: { id_detalle_carga: id },
      include: {
        clientes: true,
        frutas: true,
        variedades: true,
        tipos_jaba: true,
        detalle_carga_calidades: {
          include: { calidades: true },
        },
      },
    });
    if (!detalle) {
      throw new NotFoundException(`Detalle de carga con ID ${id} no encontrado`);
    }
    return detalle;
  }

  /**
   * Actualiza un detalle de carga existente.
   * No se permite cambiar el item de reparto asociado (se gestiona aparte).
   */
  async update(id: number, dto: UpdateDetalleCargaDto) {
    await this.findOne(id); // verificar existencia

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No se enviaron datos para actualizar');
    }

    // Validar las nuevas relaciones si cambian
    await this.validateRelations(dto);

    return this.prisma.detalle_carga.update({
      where: { id_detalle_carga: id },
      data: {
        id_cliente_emisor: dto.id_cliente_emisor,
        id_fruta: dto.id_fruta,
        id_variedad: dto.id_variedad,
        id_tipo_jaba: dto.id_tipo_jaba,
        cantidad_jabas: dto.cantidad_jabas,
        es_reparto: dto.es_reparto,
        instruccion_reparto: dto.instruccion_reparto,
        observaciones: dto.observaciones,
        requiere_retorno_jabas: dto.requiere_retorno_jabas,
      },
      include: {
        clientes: true,
        frutas: true,
        variedades: true,
        tipos_jaba: true,
      },
    });
  }

  /**
   * Elimina un detalle de carga (borrado físico).
   * Las calidades asociadas se eliminan en cascada si la relación está configurada.
   */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.detalle_carga.delete({
      where: { id_detalle_carga: id },
    });
  }

  // ==================== CALIDADES ====================

  /**
   * Obtiene todas las calidades asociadas a un detalle de carga.
   */
  async findCalidadesByDetalle(detalleId: number) {
    await this.findOne(detalleId);
    return this.prisma.detalle_carga_calidades.findMany({
      where: { id_detalle_carga: detalleId },
      include: { calidades: true },
    });
  }

  /**
   * Agrega una calidad a un detalle de carga.
   * Verifica que la calidad exista y que no esté ya asociada.
   */
  async addCalidad(detalleId: number, dto: CreateDetalleCalidadDto) {
    // ---- LOG 1: Ver qué llega al servicio ----
    console.log('[addCalidad] DTO recibido:', JSON.stringify(dto, null, 2));
    console.log('[addCalidad] precio_unitario raw:', dto.precio_unitario);
    console.log('[addCalidad] tipo de precio_unitario:', typeof dto.precio_unitario);

    // ---- Validación extra: asegurar que sea número (o null) ----
    let precioFinal: number | null = null;
    if (dto.precio_unitario !== undefined && dto.precio_unitario !== null) {
      const num = Number(dto.precio_unitario);
      if (!isNaN(num) && num >= 0) {
        precioFinal = num;
      } else {
        console.warn('[addCalidad] precio_unitario inválido, se usará null');
      }
    }
    console.log('[addCalidad] precioFinal a guardar:', precioFinal);

    // 1. Verificar que el detalle exista
    const detalle = await this.findOne(detalleId);

    // 2. Verificar que la calidad exista
    const calidad = await this.prisma.calidades.findUnique({
      where: { id_calidad: dto.id_calidad },
    });
    if (!calidad) {
      throw new NotFoundException(`Calidad con ID ${dto.id_calidad} no existe`);
    }

    // 3. Evitar duplicado de la misma calidad en el mismo detalle
    const existing = await this.prisma.detalle_carga_calidades.findFirst({
      where: {
        id_detalle_carga: detalleId,
        id_calidad: dto.id_calidad,
      },
    });
    if (existing) {
      throw new BadRequestException(`La calidad ya está asociada a este detalle`);
    }

    // 4. Crear la calidad en detalle_carga_calidades
    const nuevaCalidad = await this.prisma.detalle_carga_calidades.create({
      data: {
        id_empresa: 1, // desde token
        id_detalle_carga: detalleId,
        id_calidad: dto.id_calidad,
        cantidad: dto.cantidad,
        precio_unitario: precioFinal, // <-- USAR EL VALOR SANEADO
      },
      include: { calidades: true },
    });

    // 5. Si el detalle requiere reparto, vincular con items_reparto_detalle
    if (detalle.es_reparto) {
      const itemReparto = await this.prisma.items_reparto.findFirst({
        where: { id_detalle_carga: detalleId },
      });
      if (itemReparto) {
        await this.prisma.items_reparto_detalle.create({
          data: {
            id_empresa: 1,
            id_item_reparto: itemReparto.id_item_reparto,
            id_detalle_carga_calidad: nuevaCalidad.id_detalle_carga_calidad,
            cantidad: dto.cantidad,
            precio_unitario: precioFinal, // <-- MISMO VALOR SANEADO
            observaciones: null,
          },
        });
      }
    }

    return nuevaCalidad;
  }
  /**
   * Actualiza la cantidad y/o precio unitario de una calidad asociada.
   */
  async updateCalidad(calidadId: number, dto: UpdateDetalleCalidadDto) {
    const calidadRel = await this.prisma.detalle_carga_calidades.findUnique({
      where: { id_detalle_carga_calidad: calidadId },
    });
    if (!calidadRel) {
      throw new NotFoundException(`Relación calidad con ID ${calidadId} no encontrada`);
    }

    // Actualizar la calidad
    const updated = await this.prisma.detalle_carga_calidades.update({
      where: { id_detalle_carga_calidad: calidadId },
      data: {
        cantidad: dto.cantidad,
        precio_unitario: dto.precio_unitario,
      },
      include: { calidades: true },
    });

    // Si el detalle es de reparto, actualizar también el items_reparto_detalle relacionado
    const detalle = await this.prisma.detalle_carga.findUnique({
      where: { id_detalle_carga: calidadRel.id_detalle_carga },
      select: { es_reparto: true },
    });
    if (detalle?.es_reparto) {
      const itemReparto = await this.prisma.items_reparto.findFirst({
        where: { id_detalle_carga: calidadRel.id_detalle_carga },
      });
      if (itemReparto) {
        await this.prisma.items_reparto_detalle.updateMany({
          where: {
            id_item_reparto: itemReparto.id_item_reparto,
            id_detalle_carga_calidad: calidadId,
          },
          data: {
            cantidad: dto.cantidad,
            precio_unitario: dto.precio_unitario,
          },
        });
      }
    }

    return updated;
  }

  /**
   * Elimina una calidad de un detalle de carga.
   */
  async removeCalidad(calidadId: number) {
    const calidadRel = await this.prisma.detalle_carga_calidades.findUnique({
      where: { id_detalle_carga_calidad: calidadId },
    });
    if (!calidadRel) {
      throw new NotFoundException(`Relación calidad con ID ${calidadId} no encontrada`);
    }

    // Si el detalle es de reparto, eliminar el items_reparto_detalle asociado
    const detalle = await this.prisma.detalle_carga.findUnique({
      where: { id_detalle_carga: calidadRel.id_detalle_carga },
      select: { es_reparto: true },
    });
    if (detalle?.es_reparto) {
      const itemReparto = await this.prisma.items_reparto.findFirst({
        where: { id_detalle_carga: calidadRel.id_detalle_carga },
      });
      if (itemReparto) {
        await this.prisma.items_reparto_detalle.deleteMany({
          where: {
            id_item_reparto: itemReparto.id_item_reparto,
            id_detalle_carga_calidad: calidadId,
          },
        });
      }
    }

    // Eliminar la calidad
    return this.prisma.detalle_carga_calidades.delete({
      where: { id_detalle_carga_calidad: calidadId },
    });
  }

  // ==================== VALIDACIONES COMUNES ====================

  /**
   * Valida que las entidades referenciadas (cliente, fruta, variedad, tipo_jaba) existan.
   * Se usa tanto en creación como en actualización.
   */
  private async validateRelations(dto: any) {
    const { id_cliente_emisor, id_fruta, id_variedad, id_tipo_jaba } = dto;

    if (id_cliente_emisor) {
      const exists = await this.prisma.clientes.findUnique({ where: { id_cliente: id_cliente_emisor } });
      if (!exists) throw new BadRequestException(`Cliente con ID ${id_cliente_emisor} no existe`);
    }
    if (id_fruta) {
      const exists = await this.prisma.frutas.findUnique({ where: { id_fruta } });
      if (!exists) throw new BadRequestException(`Fruta con ID ${id_fruta} no existe`);
    }
    if (id_variedad) {
      const exists = await this.prisma.variedades.findUnique({ where: { id_variedad } });
      if (!exists) throw new BadRequestException(`Variedad con ID ${id_variedad} no existe`);
    }
    if (id_tipo_jaba) {
      const exists = await this.prisma.tipos_jaba.findUnique({ where: { id_tipo_jaba } });
      if (!exists) throw new BadRequestException(`Tipo de jaba con ID ${id_tipo_jaba} no existe`);
    }
  }
}