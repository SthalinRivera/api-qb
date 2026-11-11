import { resumenReparto } from '../operaciones-carga/resumen-reparto';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateGuiaOperativaDto } from './dto/create-guias-operativa.dto';
import { UpdateGuiaOperativaDto } from './dto/update-guias-operativa.dto';
import { QueryGuiasOperativasDto } from './dto/query-guias-operativas.dto';
// Elimina importaciones de CreateGuiaDetalleDto, UpdateGuiaDetalleDto

@Injectable()
export class GuiasOperativasService {
  constructor(private prisma: PrismaService) { }

  async create(createDto: CreateGuiaOperativaDto) {
    const item = await this.prisma.scoped.items_reparto.findUnique({ where: { id_item_reparto: createDto.id_item_reparto }, include: { detalle_carga: true } });
    if (!item) throw new NotFoundException('Destino no encontrado.');
    const guias = await this.emitirOperacion(Number(item.detalle_carga.id_operacion), Number(item.id_item_reparto));
    return guias[0];
  }

  async emitirOperacion(operacionId: number, itemId?: number) {
    return this.prisma.scoped.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${BigInt(operacionId)} AND id_empresa = ${this.prisma.empresaId} FOR UPDATE`;
      const op = await tx.operaciones_carga.findUnique({ where: { id_operacion: operacionId }, include: { empresas: true, camiones: true, usuarios_operaciones_carga_id_repartidor_asignadoTousuarios: true, sedes_operaciones_carga_id_sede_origenTosedes: true, sedes_operaciones_carga_id_sede_destinoTosedes: true } });
      if (!op) throw new NotFoundException('Operación no encontrada.');
      if (!['en_transito','repartiendo'].includes(op.estado || '')) throw new BadRequestException('La emisión requiere una carga en tránsito o reparto.');
      const cargas = await tx.detalle_carga.findMany({ where: { id_operacion: operacionId }, include: { detalle_carga_calidades: true, items_reparto: { include: { items_reparto_detalle: true, entregas: true, resoluciones_reparto: true } } } });
      if (!resumenReparto(cargas).preparada) throw new BadRequestException('Completa y concilia la clasificación y las asignaciones antes de emitir.');
      const items = await tx.items_reparto.findMany({ where: { detalle_carga: { id_operacion: operacionId }, ...(itemId ? { id_item_reparto: itemId } : {}) }, include: {
        clientes: true, puestos: { include: { lugares_operativos: true } }, guias_operativas: true, entregas: true,
        detalle_carga: { include: { frutas: true, variedades: true, tipos_jaba: true, clientes: true } },
        items_reparto_detalle: { include: { detalle_carga_calidades: { include: { calidades: true } } } },
      } });
      if (!items.length) throw new BadRequestException('No hay destinos para emitir.');
      const guias: any[] = [];
      for (const item of items) {
        const vigente = item.guias_operativas.find((g) => !['anulada','reemplazada'].includes(g.estado || ''));
        if (vigente) { guias.push(vigente); continue; }
        if (item.entregas.length) throw new BadRequestException('El destino tiene entregas históricas sin guía vigente. Requiere revisión documental.');
        const detalle = item.detalle_carga;
        if (item.cantidad_asignada <= 0 || (detalle.es_reparto && item.items_reparto_detalle.reduce((sum, d) => sum + d.cantidad, 0) !== item.cantidad_asignada))
          throw new BadRequestException('Completa el desglose del destino antes de emitir su guía.');
        const cobertura = JSON.parse(JSON.stringify({ version: 1, tipo: 'item_completo',
          documento: { empresa: op.empresas, repartidor: op.usuarios_operaciones_carga_id_repartidor_asignadoTousuarios,
            item: { id_item_reparto: item.id_item_reparto, cantidad_asignada: item.cantidad_asignada, seccion: item.seccion,
              clientes: item.clientes, puestos: item.puestos, items_reparto_detalle: item.items_reparto_detalle,
              detalle_carga: { ...detalle, operaciones_carga: op } } },
          id_operacion: op.id_operacion, id_detalle_carga: item.id_detalle_carga, id_item_reparto: item.id_item_reparto,
          cantidad: item.cantidad_asignada, id_cliente_receptor: item.id_cliente_receptor, id_puesto: item.id_puesto,
          receptor: item.clientes, puesto: item.puestos, producto: detalle.frutas, variedad: detalle.variedades,
          tipo_jaba: detalle.tipos_jaba, emisor: detalle.clientes,
          calidades: item.items_reparto_detalle.map((d) => ({ id_detalle_carga_calidad: d.id_detalle_carga_calidad, cantidad: d.cantidad, precio_unitario: d.precio_unitario, nombre: d.detalle_carga_calidades.calidades.nombre })),
        }, (_, value) => typeof value === 'bigint' ? String(value) : value));
        guias.push(await tx.guias_operativas.create({ data: {
          id_empresa: op.id_empresa, id_item_reparto: item.id_item_reparto, id_puesto: item.id_puesto,
          numero_guia: `G-${op.id_operacion}-I${item.id_item_reparto}-V${item.guias_operativas.length + 1}`,
          fecha_emision: new Date(), id_repartidor: op.id_repartidor_asignado, estado: 'emitida', cobertura,
        } }));
      }
      return guias;
    });
  }

  async findAll(query: QueryGuiasOperativasDto) {
    const where: any = {};
    if (query.estado) where.estado = query.estado;
    if (query.id_repartidor) where.id_repartidor = query.id_repartidor;
    if (query.fecha_emision) {
      const start = new Date(query.fecha_emision);
      const end = new Date(query.fecha_emision);
      end.setDate(end.getDate() + 1);
      where.fecha_emision = { gte: start, lt: end };
    }
    return this.prisma.scoped.guias_operativas.findMany({
      where,
      include: { usuarios: true, items_reparto: true },
      orderBy: { fecha_emision: 'desc' },
    });
  }
  async findOne(id: number) {
    const guia = await this.prisma.scoped.guias_operativas.findUnique({
      where: { id_guia: id },
      include: {
        usuarios: true,
        empresas: true,
        items_reparto: {
          include: {
            clientes: true,
            puestos: {
              include: { lugares_operativos: true },
            },
            detalle_carga: {
              include: {
                operaciones_carga: {
                  include: {
                    camiones: true,
                    sedes_operaciones_carga_id_sede_origenTosedes: true,
                    sedes_operaciones_carga_id_sede_destinoTosedes: true,
                  },
                },
                clientes: true,        // 👈 emisor
                frutas: true,          // 👈 fruta
                tipos_jaba: true,      // 👈 tipo de jaba
                variedades: true,      // 👈 variedad
              },
            },
            items_reparto_detalle: {
              include: {
                detalle_carga_calidades: {
                  include: { calidades: true },
                },
              },
            },
          },
        },
        entregas: {
          include: { usuarios: true },
        },
      },
    });

    if (!guia) throw new NotFoundException(`Guía ${id} no encontrada`);

    return guia;
  }

  private async modificar(id: number, estado?: string, observaciones?: string) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const ref = await tx.guias_operativas.findUnique({ where: { id_guia: id }, include: { items_reparto: { include: { detalle_carga: true } } } });
      if (!ref) throw new NotFoundException('Guía no encontrada.');
      const operacionId = ref.items_reparto.detalle_carga.id_operacion;
      await tx.$queryRaw`SELECT id_operacion FROM operaciones_carga WHERE id_operacion = ${operacionId} AND id_empresa = ${this.prisma.empresaId} FOR UPDATE`;
      const op = await tx.operaciones_carga.findUniqueOrThrow({ where: { id_operacion: operacionId } });
      if (!['en_transito','repartiendo'].includes(op.estado || '')) throw new BadRequestException('La operación no permite cambios documentales.');
      const guia = await tx.guias_operativas.findUniqueOrThrow({ where: { id_guia: id }, include: { entregas: true } });
      if (['anulada','reemplazada'].includes(guia.estado || '')) throw new BadRequestException('Una guía anulada no se puede reabrir.');
      if (estado && !['anulada','observada','firmada'].includes(estado)) throw new BadRequestException('Transición de guía no permitida.');
      if (estado === 'anulada' && guia.entregas.length) throw new BadRequestException('La guía tiene entregas. Conserva el documento y registra una resolución física.');
      if (estado === 'firmada' && !guia.entregas.some((e) => e.firma_recibido)) throw new BadRequestException('Primero registra la firma de recepción.');
      return tx.guias_operativas.update({ where: { id_guia: id }, data: { estado, observaciones } });
    });
  }
  async update(id: number, dto: UpdateGuiaOperativaDto) {
    if (Object.keys(dto).some((key) => key !== 'observaciones')) throw new BadRequestException('La cobertura y cabecera emitidas son inmutables. Anula y vuelve a emitir antes de entregar.');
    return this.modificar(id, undefined, dto.observaciones);
  }
  async remove(id: number) { return this.modificar(id, 'anulada'); }
  async sign(id: number) { return this.modificar(id, 'firmada'); }
  async changeState(id: number, estado: string) { return this.modificar(id, estado); }

  private async validateRelations(dto: any) {
    if (dto.id_repartidor) {
      const exists = await this.prisma.scoped.usuarios.findUnique({
        where: { id_usuario: dto.id_repartidor },
      });
      if (!exists) throw new BadRequestException(`Repartidor ID ${dto.id_repartidor} no existe`);
    }
    if (dto.id_item_reparto) {
      const exists = await this.prisma.scoped.items_reparto.findUnique({
        where: { id_item_reparto: dto.id_item_reparto },
      });
      if (!exists) throw new BadRequestException(`Item reparto ID ${dto.id_item_reparto} no existe`);
    }
  }
}