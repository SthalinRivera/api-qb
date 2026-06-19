import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateItemRepartoDto } from './dto/create-items-reparto.dto';
import { UpdateItemRepartoDto } from './dto/update-items-reparto.dto';
import { QueryItemsRepartoDto } from './dto/query-items-reparto.dto';
import { UpdateItemsRepartoDetalleDto } from './dto/update-items-reparto-detalle.dto';
import { CreateItemsRepartoDetalleDto } from './dto/create-items-reparto-detalle.dto';
import { CreateItemRepartoConDetallesDto } from './dto/create-items-reparto-con-detalles.dto';
import { CreateItemsRepartoMultipleDto } from './dto/create-items-reparto-multiple.dto';

@Injectable()
export class ItemsRepartoService {
  constructor(private prisma: PrismaService) { }

  // ==================== CREAR ÍTEM CON DETALLES ====================
  async createFromCalidades(dto: CreateItemRepartoConDetallesDto) {
    // 1. Validar que el detalle de carga existe
    const detalle = await this.prisma.detalle_carga.findUnique({
      where: { id_detalle_carga: BigInt(dto.id_detalle_carga) },
      include: { detalle_carga_calidades: true },
    });
    if (!detalle) throw new NotFoundException('Detalle de carga no encontrado');

    // 2. Validar que todas las calidades pertenecen al detalle
    const calidadIds = dto.detalles.map(d => BigInt(d.id_detalle_carga_calidad));
    const calidadesExistentes = await this.prisma.detalle_carga_calidades.findMany({
      where: {
        id_detalle_carga_calidad: { in: calidadIds },
        id_detalle_carga: BigInt(dto.id_detalle_carga),
      },
    });
    if (calidadesExistentes.length !== calidadIds.length) {
      throw new BadRequestException('Alguna calidad no pertenece al detalle');
    }

    // 3. Validar cantidades disponibles
    for (const det of dto.detalles) {
      const calidad = calidadesExistentes.find(
        c => Number(c.id_detalle_carga_calidad) === det.id_detalle_carga_calidad
      );
      if (!calidad) {
        throw new BadRequestException(`Calidad ID ${det.id_detalle_carga_calidad} no encontrada`);
      }

      const asignadoPrevio = await this.prisma.items_reparto_detalle.aggregate({
        where: { id_detalle_carga_calidad: BigInt(det.id_detalle_carga_calidad) },
        _sum: { cantidad: true },
      });
      const totalAsignado = Number(asignadoPrevio._sum.cantidad) || 0;

      if (totalAsignado + det.cantidad > calidad.cantidad) {
        throw new BadRequestException(
          `La cantidad para calidad ${calidad.id_detalle_carga_calidad} excede lo disponible (${calidad.cantidad - totalAsignado} restante)`
        );
      }
    }

    // 4. Crear en transacción
    return this.prisma.$transaction(async (tx) => {
      const totalCantidad = dto.detalles.reduce((sum, d) => sum + d.cantidad, 0);

      const item = await tx.items_reparto.create({
        data: {
          id_empresa: 1,
          id_detalle_carga: BigInt(dto.id_detalle_carga),
          id_cliente_receptor: BigInt(dto.id_cliente_receptor),
          id_puesto: BigInt(dto.id_puesto),
          cantidad_asignada: totalCantidad,
          orden_entrega: dto.orden_entrega,
          observaciones: dto.observaciones,
          seccion: dto.seccion,
        },
      });

      for (const det of dto.detalles) {
        await tx.items_reparto_detalle.create({
          data: {
            id_empresa: 1,
            id_item_reparto: item.id_item_reparto,
            id_detalle_carga_calidad: BigInt(det.id_detalle_carga_calidad),
            cantidad: det.cantidad,
            precio_unitario: det.precio_unitario,
          },
        });
      }

      // Verificar si todas las calidades están asignadas
      const calidadesDelDetalle = await tx.detalle_carga_calidades.findMany({
        where: { id_detalle_carga: BigInt(dto.id_detalle_carga) },
      });

      let todasAsignadas = true;
      for (const cal of calidadesDelDetalle) {
        const asignado = await tx.items_reparto_detalle.aggregate({
          where: { id_detalle_carga_calidad: cal.id_detalle_carga_calidad },
          _sum: { cantidad: true },
        });
        if ((Number(asignado._sum.cantidad) || 0) < cal.cantidad) {
          todasAsignadas = false;
          break;
        }
      }

      if (todasAsignadas) {
        // Opcional: actualizar detalle_carga
        // await tx.detalle_carga.update({
        //   where: { id_detalle_carga: BigInt(dto.id_detalle_carga) },
        //   data: { reparto_completado: true },
        // });
      }

      return item;
    });
  }

  // ==================== CRUD ====================
  async create(createDto: CreateItemRepartoDto) {
    await this.validateCantidadDisponible(createDto.id_detalle_carga, createDto.cantidad_asignada);
    await this.validateRelations(createDto);

    return this.prisma.items_reparto.create({
      data: {
        id_empresa: 1,
        id_detalle_carga: BigInt(createDto.id_detalle_carga),
        id_cliente_receptor: BigInt(createDto.id_cliente_receptor),
        id_puesto: BigInt(createDto.id_puesto),
        cantidad_asignada: createDto.cantidad_asignada,
        orden_entrega: createDto.orden_entrega,
        observaciones: createDto.observaciones,
        seccion: createDto.seccion,
      },
      include: { detalle_carga: true, clientes: true, puestos: true },
    });
  }

  // items-reparto.service.ts
  async findAll(query: QueryItemsRepartoDto) {
    const where: any = {};
    if (query.id_detalle_carga) where.id_detalle_carga = BigInt(query.id_detalle_carga);
    if (query.id_cliente_receptor) where.id_cliente_receptor = BigInt(query.id_cliente_receptor);
    if (query.id_puesto) where.id_puesto = BigInt(query.id_puesto);
    if (query.seccion) where.seccion = query.seccion;

    // 1. Obtener los items con sus relaciones (sin guias_operativas directas)
    const items = await this.prisma.items_reparto.findMany({
      where,
      include: {
        detalle_carga: {
          include: {
            operaciones_carga: {
              include: {
                camiones: true,
                sedes_operaciones_carga_id_sede_origenTosedes: true,
              },
            },
          },
        },
        clientes: true,
        puestos: {
          include: { lugares_operativos: true }, // 👈 Asegurar que incluye lugares_operativos
        },
        entregas: true,
        // ❌ Elimina 'guias_operativas: true' de aquí
        items_reparto_detalle: {
          include: {
            detalle_carga_calidades: {
              include: { calidades: true },
            },
          },
        },
      },
      orderBy: { orden_entrega: 'asc' },
    });

    // 2. Si no hay items, retornar vacío (evita consultas innecesarias)
    if (items.length === 0) return items;

    // 3. Obtener las operaciones involucradas en los items (para filtrar guías)
    const operacionIds = [...new Set(
      items
        .map(item => item.detalle_carga?.id_operacion)
        .filter(Boolean)
        .map(Number)
    )];

    // 4. Obtener todas las guías que pertenecen a esas operaciones y que tienen id_puesto
    const guias = await this.prisma.guias_operativas.findMany({
      where: {
        id_puesto: { not: null },
        items_reparto: {
          detalle_carga: {
            id_operacion: { in: operacionIds.map(BigInt) },
          },
        },
      },
      include: {
        // Opcional: incluir el item relacionado para obtener la operación (ya lo tenemos)
        // Pero necesitamos la operación para mapear. Podemos filtrar directamente con el where de arriba.
      },
    });

    // 5. Construir un mapa: clave = "puestoId|operacionId" -> guia
    const guiaPorPuestoYOperacion = new Map<string, any>();
    // Para cada guía, necesitamos saber su operación. Podemos obtenerla del item relacionado (el primero).
    // Pero como la guía solo tiene un id_item_reparto, usamos ese para obtener la operación.
    // Podemos hacer un include en la consulta de guías para obtener detalle_carga.
    // Para simplificar, mejor hacemos una segunda consulta en el bucle? No, hagamos un include en la consulta de guías.

    // Re-hagamos la consulta de guías incluyendo la operación:
    const guiasConOperacion = await this.prisma.guias_operativas.findMany({
      where: {
        id_puesto: { not: null },
        items_reparto: {
          detalle_carga: {
            id_operacion: { in: operacionIds.map(BigInt) },
          },
        },
      },
      include: {
        items_reparto: {
          include: {
            detalle_carga: {
              select: { id_operacion: true },
            },
          },
        },
      },
    });

    // Construir el mapa
    guiasConOperacion.forEach(guia => {
      const puestoId = guia.id_puesto;
      const operacionId = guia.items_reparto?.detalle_carga?.id_operacion;
      if (puestoId && operacionId) {
        const key = `${puestoId}|${operacionId}`;
        // Si hubiera múltiples guías para el mismo puesto+operación (no debería), podrías tomar la primera
        if (!guiaPorPuestoYOperacion.has(key)) {
          guiaPorPuestoYOperacion.set(key, guia);
        }
      }
    });

    // 6. Enriquecer cada item con la guía correspondiente
    const itemsConGuia = items.map(item => {
      const operacionId = item.detalle_carga?.id_operacion;
      const puestoId = item.id_puesto;
      const key = `${puestoId}|${operacionId}`;
      const guia = guiaPorPuestoYOperacion.get(key) || null;
      return {
        ...item,
        guia_asociada: guia, // Campo virtual
      };
    });

    return itemsConGuia;
  }
  async findOne(id: number) {
    const item = await this.prisma.items_reparto.findUnique({
      where: { id_item_reparto: BigInt(id) },
      include: {
        detalle_carga: true,
        clientes: true,
        puestos: true,
        entregas: true,
        items_reparto_detalle: {
          include: {
            detalle_carga_calidades: {
              include: { calidades: true },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException(`Item de reparto con ID ${id} no encontrado`);
    return item;
  }

  async update(id: number, updateDto: UpdateItemRepartoDto) {
    await this.findOne(id);
    if (Object.keys(updateDto).length === 0) {
      throw new BadRequestException('No se enviaron datos para actualizar');
    }
    await this.validateRelations(updateDto);

    // Validar cantidad si se proporciona
    if (updateDto.cantidad_asignada !== undefined && updateDto.id_detalle_carga !== undefined) {
      await this.validateCantidadDisponible(updateDto.id_detalle_carga, updateDto.cantidad_asignada, id);
    }

    const data: any = { ...updateDto };
    if (data.id_detalle_carga) data.id_detalle_carga = BigInt(data.id_detalle_carga);
    if (data.id_cliente_receptor) data.id_cliente_receptor = BigInt(data.id_cliente_receptor);
    if (data.id_puesto) data.id_puesto = BigInt(data.id_puesto);

    return this.prisma.items_reparto.update({
      where: { id_item_reparto: BigInt(id) },
      data,
      include: { detalle_carga: true, clientes: true, puestos: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.items_reparto.delete({
      where: { id_item_reparto: BigInt(id) },
    });
  }

  // ==================== DETALLES ====================
  async addDetalle(itemId: number, dto: CreateItemsRepartoDetalleDto) {
    const item = await this.findOne(itemId);

    const calidadRel = await this.prisma.detalle_carga_calidades.findUnique({
      where: { id_detalle_carga_calidad: BigInt(dto.id_detalle_carga_calidad) },
    });
    if (!calidadRel) throw new NotFoundException('Calidad no encontrada');

    if (Number(calidadRel.id_detalle_carga) !== Number(item.id_detalle_carga)) {
      throw new BadRequestException('La calidad no pertenece al detalle de carga');
    }

    const asignadoPrevio = await this.prisma.items_reparto_detalle.aggregate({
      where: { id_detalle_carga_calidad: BigInt(dto.id_detalle_carga_calidad) },
      _sum: { cantidad: true },
    });
    const totalAsignado = Number(asignadoPrevio._sum.cantidad) || 0;
    if (totalAsignado + dto.cantidad > calidadRel.cantidad) {
      throw new BadRequestException(
        `Cantidad excede lo disponible (${calidadRel.cantidad - totalAsignado} restante)`
      );
    }

    const existing = await this.prisma.items_reparto_detalle.findFirst({
      where: {
        id_item_reparto: BigInt(itemId),
        id_detalle_carga_calidad: BigInt(dto.id_detalle_carga_calidad),
      },
    });
    if (existing) throw new BadRequestException('Esta calidad ya está asociada a este ítem');

    return this.prisma.items_reparto_detalle.create({
      data: {
        id_empresa: 1,
        id_item_reparto: BigInt(itemId),
        id_detalle_carga_calidad: BigInt(dto.id_detalle_carga_calidad),
        cantidad: dto.cantidad,
        precio_unitario: dto.precio_unitario,
      },
      include: {
        detalle_carga_calidades: {
          include: { calidades: true },
        },
      },
    });
  }

  async findAllDetalles(itemId?: number) {
    const where: any = {};
    if (itemId) where.id_item_reparto = BigInt(itemId);

    return this.prisma.items_reparto_detalle.findMany({
      where,
      include: {
        detalle_carga_calidades: {
          include: { calidades: true },
        },
        items_reparto: true,
      },
    });
  }

  async findOneDetalle(id: number) {
    const detalle = await this.prisma.items_reparto_detalle.findUnique({
      where: { id_item_reparto_detalle: BigInt(id) },
      include: {
        detalle_carga_calidades: { include: { calidades: true } },
        items_reparto: true,
      },
    });
    if (!detalle) throw new NotFoundException(`Detalle de reparto con ID ${id} no encontrado`);
    return detalle;
  }

  async updateDetalle(id: number, dto: UpdateItemsRepartoDetalleDto) {
    const detalleActual = await this.findOneDetalle(id);

    if (dto.cantidad !== undefined) {
      const calidadRel = await this.prisma.detalle_carga_calidades.findUnique({
        where: { id_detalle_carga_calidad: detalleActual.id_detalle_carga_calidad },
      });
      if (!calidadRel) throw new NotFoundException('Calidad no encontrada');

      const asignadoPrevio = await this.prisma.items_reparto_detalle.aggregate({
        where: {
          id_detalle_carga_calidad: detalleActual.id_detalle_carga_calidad,
          NOT: { id_item_reparto_detalle: BigInt(id) },
        },
        _sum: { cantidad: true },
      });
      const totalAsignado = Number(asignadoPrevio._sum.cantidad) || 0;
      if (totalAsignado + dto.cantidad > calidadRel.cantidad) {
        throw new BadRequestException(
          `Cantidad excede lo disponible (${calidadRel.cantidad - totalAsignado} restante)`
        );
      }
    }

    return this.prisma.items_reparto_detalle.update({
      where: { id_item_reparto_detalle: BigInt(id) },
      data: {
        cantidad: dto.cantidad,
        precio_unitario: dto.precio_unitario,
      },
      include: { detalle_carga_calidades: true },
    });
  }

  async removeDetalle(id: number) {
    await this.findOneDetalle(id);
    return this.prisma.items_reparto_detalle.delete({
      where: { id_item_reparto_detalle: BigInt(id) },
    });
  }

  // ==================== AUXILIARES ====================
  private async validateCantidadDisponible(
    detalleId: number,
    cantidadAsignar: number,
    excludeItemId?: number,
  ) {
    const detalle = await this.prisma.detalle_carga.findUnique({
      where: { id_detalle_carga: BigInt(detalleId) },
    });
    if (!detalle) throw new NotFoundException('Detalle no encontrado');

    const whereItem: any = { id_detalle_carga: BigInt(detalleId) };
    if (excludeItemId) {
      whereItem.NOT = { id_item_reparto: BigInt(excludeItemId) };
    }

    const asignadoTotal = await this.prisma.items_reparto.aggregate({
      where: whereItem,
      _sum: { cantidad_asignada: true },
    });
    const yaAsignado = Number(asignadoTotal._sum.cantidad_asignada) || 0;

    if (yaAsignado + cantidadAsignar > detalle.cantidad_jabas) {
      throw new BadRequestException(
        `La cantidad excede el total del detalle (${detalle.cantidad_jabas - yaAsignado} restante)`
      );
    }
  }

  private async validateRelations(dto: any) {
    if (dto.id_detalle_carga) {
      const exists = await this.prisma.detalle_carga.findUnique({
        where: { id_detalle_carga: BigInt(dto.id_detalle_carga) },
      });
      if (!exists) throw new BadRequestException(`Detalle de carga ID ${dto.id_detalle_carga} no existe`);
    }
    if (dto.id_cliente_receptor) {
      const exists = await this.prisma.clientes.findUnique({
        where: { id_cliente: BigInt(dto.id_cliente_receptor) },
      });
      if (!exists) throw new BadRequestException(`Cliente receptor ID ${dto.id_cliente_receptor} no existe`);
    }
    if (dto.id_puesto) {
      const exists = await this.prisma.puestos.findUnique({
        where: { id_puesto: BigInt(dto.id_puesto) },
      });
      if (!exists) throw new BadRequestException(`Puesto ID ${dto.id_puesto} no existe`);
    }
  }

  // ==================== ENDPOINTS ANIDADOS ====================
  async findByDetalleCarga(detalleId: number) {
    const detalle = await this.prisma.detalle_carga.findUnique({
      where: { id_detalle_carga: BigInt(detalleId) },
    });
    if (!detalle) throw new NotFoundException(`Detalle de carga con ID ${detalleId} no existe`);

    return this.prisma.items_reparto.findMany({
      where: { id_detalle_carga: BigInt(detalleId) },
      include: {
        clientes: true,
        puestos: true,
        entregas: true,
        items_reparto_detalle: {
          include: { detalle_carga_calidades: { include: { calidades: true } } },
        },
      },
    });
  }

  async createMultipleFromCalidades(dto: CreateItemsRepartoMultipleDto) {
    // 1. Validar que el detalle existe y obtener sus calidades
    const detalle = await this.prisma.detalle_carga.findUnique({
      where: { id_detalle_carga: BigInt(dto.id_detalle_carga) },
      include: { detalle_carga_calidades: true },
    });
    if (!detalle) {
      throw new NotFoundException(`Detalle de carga ID ${dto.id_detalle_carga} no existe`);
    }

    // 2. Validar que todas las calidades referenciadas pertenezcan al detalle
    const todasCalidades = detalle.detalle_carga_calidades;
    const calidadIds = dto.asignaciones.flatMap(a => a.detalles.map(d => d.id_detalle_carga_calidad));
    const setCalidades = new Set(calidadIds);
    for (const id of setCalidades) {
      const existe = todasCalidades.some(c => Number(c.id_detalle_carga_calidad) === id);
      if (!existe) {
        throw new BadRequestException(`Calidad ID ${id} no pertenece al detalle`);
      }
    }

    // 3. Validar que las cantidades no excedan lo disponible (por calidad)
    //    Sumamos lo ya asignado en items_reparto_detalle (si existe) para descontar.
    const asignadoPrevio = await this.prisma.items_reparto_detalle.groupBy({
      by: ['id_detalle_carga_calidad'],
      where: {
        items_reparto: { id_detalle_carga: BigInt(dto.id_detalle_carga) }
      },
      _sum: { cantidad: true },
    });
    const mapaAsignado = new Map<number, number>();
    for (const item of asignadoPrevio) {
      mapaAsignado.set(Number(item.id_detalle_carga_calidad), Number(item._sum.cantidad) || 0);
    }

    // Para cada calidad, verificar que la suma de lo nuevo + lo ya asignado no supere el total
    for (const calidad of todasCalidades) {
      const idCal = Number(calidad.id_detalle_carga_calidad);
      const totalDisponible = calidad.cantidad;
      const yaAsignado = mapaAsignado.get(idCal) || 0;
      let nuevaCantidad = 0;
      for (const asign of dto.asignaciones) {
        for (const det of asign.detalles) {
          if (det.id_detalle_carga_calidad === idCal) {
            nuevaCantidad += det.cantidad;
          }
        }
      }
      if (yaAsignado + nuevaCantidad > totalDisponible) {
        throw new BadRequestException(
          `La calidad ${calidad.id_calidad} tiene ${totalDisponible} disponible, ya se asignaron ${yaAsignado}, y se intenta asignar ${nuevaCantidad}. Excede el límite.`
        );
      }
    }

    // 4. Crear en transacción
    return this.prisma.$transaction(async (tx) => {
      // ✅ Tipamos explícitamente como any[] para evitar el error never[]
      const itemsCreados: any[] = [];

      for (const asign of dto.asignaciones) {
        const totalCantidad = asign.detalles.reduce((sum, d) => sum + d.cantidad, 0);

        // Validar que el cliente y puesto existan (opcional pero recomendado)
        await this.validateRelations({
          id_cliente_receptor: asign.id_cliente_receptor,
          id_puesto: asign.id_puesto,
        });

        const item = await tx.items_reparto.create({
          data: {
            id_empresa: 1,
            id_detalle_carga: BigInt(dto.id_detalle_carga),
            id_cliente_receptor: BigInt(asign.id_cliente_receptor),
            id_puesto: BigInt(asign.id_puesto),
            cantidad_asignada: totalCantidad,
            orden_entrega: asign.orden_entrega,
            observaciones: asign.observaciones,
            seccion: asign.seccion,
          },
        });

        // Crear los items_reparto_detalle
        for (const det of asign.detalles) {
          await tx.items_reparto_detalle.create({
            data: {
              id_empresa: 1,
              id_item_reparto: item.id_item_reparto,
              id_detalle_carga_calidad: BigInt(det.id_detalle_carga_calidad),
              cantidad: det.cantidad,
              precio_unitario: det.precio_unitario,
            },
          });
        }

        itemsCreados.push(item);
      }

      // Opcional: marcar el detalle como "reparto completado" si todas las calidades están asignadas
      // (puedes implementar la misma lógica que en createFromCalidades)

      return itemsCreados;
    });
  }


}
