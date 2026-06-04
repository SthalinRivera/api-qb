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

  async create(operacionId: number, dto: CreateDetalleCargaForOperacionDto) {
    // Verificar existencia de la operación
    const operacion = await this.prisma.operaciones_carga.findUnique({
      where: { id_operacion: operacionId },
    });
    if (!operacion) {
      throw new NotFoundException(`Operación con ID ${operacionId} no existe`);
    }

    // Validar relaciones (cliente, fruta, variedad, tipo_jaba)
    await this.validateRelations(dto);

    return this.prisma.detalle_carga.create({
      data: {
        id_empresa: 1, // Reemplazar con id_empresa del token
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
  }

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
        detalle_carga_calidades: {
          include: { calidades: true },
        },
      },
      orderBy: { id_detalle_carga: 'asc' },
    });
  }

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

  async update(id: number, dto: UpdateDetalleCargaDto) {
    await this.findOne(id); // existe?
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No se enviaron datos para actualizar');
    }

    // Si se actualizan relaciones, validarlas
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

  async remove(id: number) {
    await this.findOne(id);
    // Eliminar en cascada las calidades asociadas (Prisma lo hará si la relación está configurada)
    return this.prisma.detalle_carga.delete({
      where: { id_detalle_carga: id },
    });
  }

  // ==================== CALIDADES ====================

  async findCalidadesByDetalle(detalleId: number) {
    // Verificar que el detalle exista
    await this.findOne(detalleId);
    return this.prisma.detalle_carga_calidades.findMany({
      where: { id_detalle_carga: detalleId },
      include: { calidades: true },
    });
  }

  async addCalidad(detalleId: number, dto: CreateDetalleCalidadDto) {
    const detalle = await this.findOne(detalleId);

    // Verificar que la calidad exista
    const calidad = await this.prisma.calidades.findUnique({
      where: { id_calidad: dto.id_calidad },
    });
    if (!calidad) {
      throw new NotFoundException(`Calidad con ID ${dto.id_calidad} no existe`);
    }

    // Verificar que no exista ya esa calidad para este detalle
    const existing = await this.prisma.detalle_carga_calidades.findFirst({
      where: {
        id_detalle_carga: detalleId,
        id_calidad: dto.id_calidad,
      },
    });
    if (existing) {
      throw new BadRequestException(`La calidad ya está asociada a este detalle`);
    }

    return this.prisma.detalle_carga_calidades.create({
      data: {
        id_empresa: 1, // desde token
        id_detalle_carga: detalleId,
        id_calidad: dto.id_calidad,
        cantidad: dto.cantidad,
        precio_unitario: dto.precio_unitario,
      },
      include: { calidades: true },
    });
  }

  async updateCalidad(calidadId: number, dto: UpdateDetalleCalidadDto) {
    const calidadRel = await this.prisma.detalle_carga_calidades.findUnique({
      where: { id_detalle_carga_calidad: calidadId },
    });
    if (!calidadRel) {
      throw new NotFoundException(`Relación calidad con ID ${calidadId} no encontrada`);
    }

    return this.prisma.detalle_carga_calidades.update({
      where: { id_detalle_carga_calidad: calidadId },
      data: {
        cantidad: dto.cantidad,
        precio_unitario: dto.precio_unitario,
      },
      include: { calidades: true },
    });
  }

  async removeCalidad(calidadId: number) {
    const calidadRel = await this.prisma.detalle_carga_calidades.findUnique({
      where: { id_detalle_carga_calidad: calidadId },
    });
    if (!calidadRel) {
      throw new NotFoundException(`Relación calidad con ID ${calidadId} no encontrada`);
    }
    return this.prisma.detalle_carga_calidades.delete({
      where: { id_detalle_carga_calidad: calidadId },
    });
  }

  // ==================== VALIDACIONES COMUNES ====================

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