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

  // ==================== DETALLES ====================

  /**
   * Crea un nuevo detalle de carga dentro de una operación.
   * Si el detalle requiere reparto (es_reparto = true), automáticamente:
   *  - Valida que se haya especificado un cliente receptor.
   *  - Busca un puesto activo para ese cliente receptor (clientes_puestos con fecha_fin IS NULL).
   *  - Crea un registro en items_reparto asociado al detalle.
   */
  async create(operacionId: number, dto: CreateDetalleCargaForOperacionDto) {
    // 1. Verificar operación
    const operacion = await this.prisma.operaciones_carga.findUnique({
      where: { id_operacion: operacionId },
    });
    if (!operacion) {
      throw new NotFoundException(`Operación con ID ${operacionId} no existe`);
    }

    // 2. Validar relaciones base
    await this.validateRelations(dto);

    // 3. Si es reparto, validar cliente receptor y puesto activo
    let puestoActivo: { id_puesto: number; seccion: string | null } | null = null;
    if (dto.es_reparto) {
      if (!dto.id_cliente_receptor) {
        throw new BadRequestException('Para reparto es obligatorio indicar el cliente receptor');
      }
      const relacion = await this.prisma.clientes_puestos.findFirst({
        where: {
          id_cliente: dto.id_cliente_receptor,
          fecha_fin: null,
          estado: true,
        },
        select: {
          id_puesto: true,
          seccion: true,
        },
      });
      if (!relacion) {
        throw new BadRequestException(
          `El cliente receptor no tiene un puesto activo. Asigne un puesto al cliente antes de crear el detalle.`,
        );
      }
      puestoActivo = {
        id_puesto: Number(relacion.id_puesto),
        seccion: relacion.seccion,
      };
    }

    // 4. Crear detalle de carga
    const detalle = await this.prisma.detalle_carga.create({
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
      include: {
        clientes: true,
        frutas: true,
        variedades: true,
        tipos_jaba: true,
      },
    });

    // 5. Crear item de reparto si aplica
    let itemReparto: Awaited<ReturnType<typeof this.prisma.items_reparto.create>> | null = null;
    if (dto.es_reparto && dto.id_cliente_receptor && puestoActivo) {
      itemReparto = await this.prisma.items_reparto.create({
        data: {
          id_empresa: 1,
          id_detalle_carga: detalle.id_detalle_carga,
          id_cliente_receptor: dto.id_cliente_receptor,
          id_puesto: puestoActivo.id_puesto,
          cantidad_asignada: detalle.cantidad_jabas,
          orden_entrega: null,
          observaciones: dto.instruccion_reparto,
          seccion: puestoActivo.seccion ?? null,
        },
        include: { clientes: true, puestos: true },
      });
    }
    if (operacion.estado === 'pendiente') {
      await this.prisma.operaciones_carga.update({
        where: { id_operacion: operacionId },
        data: { estado: 'en_curso' },
      });
    }
    // 6. Retornar el detalle junto con el item de reparto (si existe)
    return {
      ...detalle,
      item_reparto: itemReparto,
    };
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
        precio_unitario: dto.precio_unitario,
      },
      include: { calidades: true },
    });

    // 5. Si el detalle requiere reparto, vincular con items_reparto_detalle
    if (detalle.es_reparto) {
      // Buscar el items_reparto asociado a este detalle
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
            precio_unitario: dto.precio_unitario,
            // subtotal se calcula automáticamente con el generado por defecto (en la BD)
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