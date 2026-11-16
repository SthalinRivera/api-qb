import {
  Controller,
  Get,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsOptional,
  Min,
  Matches,
  IsString,
  MaxLength,
} from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import {
  clienteValido,
  puestoValido,
  usuarioValido,
  destinosDisponibles,
} from './reglas-opciones';

export class OpcionesFlujoQuery {
  @IsOptional() @Matches(/^\d{6}$/) origen?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) operacion?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) detalle?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) fruta?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) cliente?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) puesto?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) calidad?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) item?: number;
  @IsOptional() @IsString() @MaxLength(100) buscar?: string;
  @IsOptional() @IsIn(['entrega']) proceso?: 'entrega';
}
const clienteSelect = {
  id_cliente: true,
  nombres: true,
  apellidos: true,
} as const;
const usuarioSelect = {
  id_usuario: true,
  nombres: true,
  apellidos: true,
} as const;

@Controller('opciones-flujo')
export class OpcionesFlujoController {
  constructor(private readonly prisma: PrismaService) {}
  private async operacion(id?: number) {
    if (!id) throw new BadRequestException('Selecciona una operación.');
    const op = await this.prisma.scoped.operaciones_carga.findUnique({
      where: { id_operacion: id },
      select: {
        id_operacion: true,
        id_ubigeo_origen: true,
        id_ubigeo_destino: true,
        estado: true,
      },
    });
    if (!op) throw new NotFoundException('Operación no encontrada.');
    return op;
  }
  @Get('operacion')
  async opcionesOperacion(@Query() q: OpcionesFlujoQuery) {
    const db = this.prisma.scoped,
      empresa = this.prisma.empresaId;
    const origenWhere = {
      cliente_distrito: {
        some: {
          id_empresa: empresa,
          estado: true,
          tipo_relacion: { in: ['emisor', 'ambos'] },
          clientes: { estado: true },
        },
      },
    };
    if (
      q.origen &&
      !(await db.distritos.findFirst({
        where: { id_ubigeo: q.origen, ...origenWhere },
        select: { id_ubigeo: true },
      }))
    )
      throw new BadRequestException(
        'El origen no tiene emisores activos de esta empresa.',
      );
    const [origenes, destinos, camiones, encargados, repartidores] =
      await Promise.all([
        db.distritos.findMany({
          where: origenWhere,
          select: { id_ubigeo: true, nombre: true },
          orderBy: { nombre: 'asc' },
        }),
        q.origen ? destinosDisponibles(db, empresa) : [],
        db.camiones.findMany({
          where: { estado: true },
          select: { id_camion: true, placa: true },
          orderBy: { placa: 'asc' },
        }),
        db.usuarios.findMany({
          where: usuarioValido(empresa, 'encargado_carga'),
          select: usuarioSelect,
          orderBy: { nombres: 'asc' },
        }),
        db.usuarios.findMany({
          where: usuarioValido(empresa, 'repartidor'),
          select: usuarioSelect,
          orderBy: { nombres: 'asc' },
        }),
      ]);
    return { origenes, destinos, camiones, encargados, repartidores };
  }
  private async destino(
    op: { id_ubigeo_destino: string },
    q: OpcionesFlujoQuery,
  ) {
    const db = this.prisma.scoped,
      empresa = this.prisma.empresaId,
      destino = op.id_ubigeo_destino;
    const [clientes, puestos, secciones, destinos] = await Promise.all([
      db.clientes.findMany({
        where: {
          ...clienteValido(empresa, destino, 'receptor'),
          clientes_puestos: {
            some: {
              id_empresa: empresa,
              estado: true,
              fecha_fin: null,
              puestos: {
                estado: true,
                lugares_operativos: {
                  id_ubigeo: destino,
                  estado: true,
                  empresa_lugares: {
                    some: { id_empresa: empresa, estado: true },
                  },
                },
              },
            },
          },
        },
        select: clienteSelect,
        orderBy: { nombres: 'asc' },
      }),
      q.cliente
        ? db.puestos.findMany({
            where: puestoValido(empresa, destino, q.cliente),
            select: {
              id_puesto: true,
              codigo_puesto: true,
              lugares_operativos: { select: { nombre: true } },
            },
            orderBy: { codigo_puesto: 'asc' },
          })
        : [],
      q.cliente && q.puesto
        ? db.clientes_puestos.findMany({
            where: {
              id_cliente: q.cliente,
              id_puesto: q.puesto,
              estado: true,
              fecha_fin: null,
              seccion: { not: null },
              puestos: puestoValido(empresa, destino, q.cliente),
            },
            select: { seccion: true },
            distinct: ['seccion'],
          })
        : [],
      db.clientes_puestos.findMany({
        where: { id_empresa: empresa, estado: true, fecha_fin: null,
          clientes: clienteValido(empresa, destino, 'receptor'),
          puestos: { estado: true, lugares_operativos: { id_ubigeo: destino, estado: true, empresa_lugares: { some: { id_empresa: empresa, estado: true } } } },
        },
        select: { id_cliente: true, id_puesto: true, seccion: true, puestos: { select: { id_puesto: true, codigo_puesto: true, lugares_operativos: { select: { nombre: true } } } } },
        orderBy: [{ id_cliente: 'asc' }, { id_puesto: 'asc' }, { seccion: 'asc' }],
      }),
    ]);
    return {
      destinos,
      clientes,
      puestos,
      secciones: secciones.map((s) => ({
        id_seccion: s.seccion,
        nombre_seccion: s.seccion,
      })),
    };
  }
  @Get('carga')
  async carga(@Query() q: OpcionesFlujoQuery) {
    const op = await this.operacion(q.operacion),
      db = this.prisma.scoped;
    const [emisores, frutas, variedades, tiposJaba, destino] =
      await Promise.all([
        db.clientes.findMany({
          where: clienteValido(
            this.prisma.empresaId,
            op.id_ubigeo_origen,
            'emisor',
          ),
          select: clienteSelect,
          orderBy: { nombres: 'asc' },
        }),
        db.frutas.findMany({
          where: { estado: true },
          select: { id_fruta: true, nombre: true },
          orderBy: { nombre: 'asc' },
        }),
        db.variedades.findMany({
              where: {
                id_fruta: q.fruta,
                estado: true,
                frutas: { estado: true },
              },
              select: { id_variedad: true, id_fruta: true, nombre: true },
              orderBy: { nombre: 'asc' },
            }),
        db.tipos_jaba.findMany({
          where: { estado: true },
          select: { id_tipo_jaba: true, nombre: true },
          orderBy: { nombre: 'asc' },
        }),
        this.destino(op, q),
      ]);
    return {
      emisores,
      frutas,
      variedades,
      tiposJaba,
      receptores: destino.clientes,
      destinos: destino.destinos,
      puestos: destino.puestos,
      secciones: destino.secciones,
    };
  }
  @Get('reparto')
  async reparto(@Query() q: OpcionesFlujoQuery) {
    const op = await this.operacion(q.operacion);
    if (!q.detalle) throw new BadRequestException('Selecciona un producto.');
    const detalle = await this.prisma.scoped.detalle_carga.findFirst({
      where: {
        id_detalle_carga: q.detalle,
        id_operacion: q.operacion,
        es_reparto: true,
      },
      select: {
        id_detalle_carga: true,
        cantidad_jabas: true,
        clientes: { select: { nombres: true } },
      },
    });
    if (!detalle)
      throw new NotFoundException(
        'Producto de reparto no encontrado en la operación.',
      );
    const [destino, calidades] = await Promise.all([
      this.destino(op, q),
      this.prisma.scoped.$queryRaw<any[]>(Prisma.sql`
      SELECT c.id_detalle_carga_calidad, c.precio_unitario,
        (c.cantidad - COALESCE((SELECT SUM(a.cantidad) FROM items_reparto_detalle a WHERE a.id_detalle_carga_calidad = c.id_detalle_carga_calidad AND a.id_empresa = ${this.prisma.empresaId}), 0))::int AS cantidad,
        json_build_object('nombre', k.nombre) AS calidades
      FROM detalle_carga_calidades c JOIN calidades k ON k.id_calidad = c.id_calidad
      WHERE c.id_empresa = ${this.prisma.empresaId} AND c.id_detalle_carga = ${BigInt(q.detalle)}
        AND c.cantidad > COALESCE((SELECT SUM(a.cantidad) FROM items_reparto_detalle a WHERE a.id_detalle_carga_calidad = c.id_detalle_carga_calidad AND a.id_empresa = ${this.prisma.empresaId}), 0)
      ORDER BY c.id_detalle_carga_calidad
    `),
    ]);
    return { detalle, calidades, ...destino };
  }
  @Get('calidades')
  async calidades(@Query() q: OpcionesFlujoQuery) {
    if (!q.detalle) throw new BadRequestException('Selecciona un producto.');
    if (
      !(await this.prisma.scoped.detalle_carga.findUnique({
        where: { id_detalle_carga: q.detalle },
        select: { id_detalle_carga: true },
      }))
    )
      throw new NotFoundException('Producto no encontrado.');
    return this.prisma.scoped.calidades.findMany({
      where: {
        estado: true,
        detalle_carga_calidades: {
          none: {
            id_detalle_carga: q.detalle,
            ...(q.calidad
              ? { id_detalle_carga_calidad: { not: q.calidad } }
              : {}),
          },
        },
      },
      select: { id_calidad: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }
  @Get('clasificacion')
  async clasificacion(@Query() q: OpcionesFlujoQuery) {
    const op = await this.operacion(q.operacion);
    if (!q.detalle) throw new BadRequestException('Selecciona un producto.');
    const detalle = await this.prisma.scoped.detalle_carga.findFirst({
      where: { id_detalle_carga: q.detalle, id_operacion: q.operacion },
      select: {
        id_detalle_carga: true,
        id_operacion: true,
        cantidad_jabas: true,
        es_reparto: true,
        frutas: { select: { nombre: true } },
        detalle_carga_calidades: {
          select: {
            id_detalle_carga_calidad: true,
            id_calidad: true,
            cantidad: true,
            precio_unitario: true,
            calidades: { select: { nombre: true } },
          },
        },
      },
    });
    if (!detalle)
      throw new NotFoundException('Producto no encontrado en la operación.');
    const [opciones, estado] = await Promise.all([
      this.calidades(q),
      this.prisma.scoped.$queryRaw<{ completa: boolean }[]>(Prisma.sql`
      SELECT EXISTS (SELECT 1 FROM detalle_carga WHERE id_empresa = ${this.prisma.empresaId} AND id_operacion = ${op.id_operacion})
        AND NOT EXISTS (SELECT 1 FROM detalle_carga d WHERE d.id_empresa = ${this.prisma.empresaId} AND d.id_operacion = ${op.id_operacion}
          AND d.cantidad_jabas <> COALESCE((SELECT SUM(cantidad) FROM detalle_carga_calidades c WHERE c.id_empresa = ${this.prisma.empresaId} AND c.id_detalle_carga = d.id_detalle_carga),0)) AS completa
    `),
    ]);
    return {
      detalle,
      opciones,
      estado: op.estado,
      clasificacionCompleta: estado[0].completa,
    };
  }
  @Get('operaciones')
  async operaciones(@Query() q: OpcionesFlujoQuery) {
    const buscar = q.buscar?.trim();
    const id = buscar && /^\d+$/.test(buscar) ? BigInt(buscar) : null;
    const operaciones = await this.prisma.scoped.operaciones_carga.findMany({
      where: {
        estado: { in: q.proceso === 'entrega' ? ['en_curso', 'en_transito', 'repartiendo'] : ['pendiente', 'en_curso', 'en_transito', 'repartiendo'] },
        ...(buscar
          ? {
              OR: [
                {
                  camiones: {
                    placa: { contains: buscar, mode: 'insensitive' as const },
                  },
                },
                ...(id ? [{ id_operacion: id }] : []),
              ],
            }
          : {}),
      },
      select: {
        id_operacion: true,
        estado: true,
        fecha_carga: true,
        camiones: { select: { placa: true } },
        detalle_carga: {
          select: {
            cantidad_jabas: true,
            es_reparto: true,
            detalle_carga_calidades: { select: { cantidad: true } },
          },
        },
      },
      orderBy: { fecha_carga: 'desc' },
    });
    return operaciones
      .filter(op => q.proceso !== 'entrega' || (
        op.detalle_carga.length > 0 && op.detalle_carga.every(d =>
          d.cantidad_jabas > 0 && d.detalle_carga_calidades.reduce((sum, c) => sum + c.cantidad, 0) === d.cantidad_jabas)
      ))
      .map(({ detalle_carga, ...op }) => op);
  }
  @Get('entrega')
  async entrega(@Query() q: OpcionesFlujoQuery) {
    const op = await this.operacion(q.operacion);
    if (!['en_transito', 'repartiendo'].includes(op.estado || '')) return { items: [] };
    const items = await this.prisma.scoped.$queryRaw<any[]>(Prisma.sql`
      SELECT i.id_item_reparto, i.id_detalle_carga, i.cantidad_asignada,
        (i.cantidad_asignada - COALESCE(e.recibidas,0) - COALESCE(r.resueltas,0))::int AS saldo_pendiente,
        json_build_object('nombres', c.nombres, 'apellidos', c.apellidos) AS clientes,
        json_build_object('codigo_puesto', p.codigo_puesto) AS puestos,
        g.id_guia, g.numero_guia
      FROM items_reparto i
      JOIN detalle_carga d ON d.id_detalle_carga = i.id_detalle_carga AND d.id_empresa = ${this.prisma.empresaId}
      JOIN clientes c ON c.id_cliente = i.id_cliente_receptor
      LEFT JOIN puestos p ON p.id_puesto = i.id_puesto
      LEFT JOIN LATERAL (SELECT SUM(cantidad_entregada) AS recibidas FROM entregas WHERE id_item_reparto = i.id_item_reparto AND id_empresa = ${this.prisma.empresaId} AND estado_entrega <> 'pendiente') e ON true
      LEFT JOIN LATERAL (SELECT SUM(cantidad) AS resueltas FROM resoluciones_reparto WHERE id_item_reparto = i.id_item_reparto AND id_empresa = ${this.prisma.empresaId}) r ON true
      JOIN LATERAL (SELECT id_guia, numero_guia, cobertura FROM guias_operativas WHERE id_item_reparto = i.id_item_reparto AND id_empresa = ${this.prisma.empresaId} AND estado NOT IN ('anulada','reemplazada') AND cobertura->>'id_item_reparto' = i.id_item_reparto::text AND CASE WHEN (cobertura->>'cantidad') ~ '^[0-9]+$' THEN (cobertura->>'cantidad')::numeric > 0 ELSE false END ORDER BY id_guia DESC LIMIT 1) g ON true
      WHERE i.id_empresa = ${this.prisma.empresaId} AND d.id_operacion = ${BigInt(q.operacion!)}
        ${q.item ? Prisma.sql`AND i.id_item_reparto = ${BigInt(q.item)}` : Prisma.empty}
        AND i.cantidad_asignada > COALESCE(e.recibidas,0) + COALESCE(r.resueltas,0)
      ORDER BY i.orden_entrega NULLS LAST, i.id_item_reparto
    `);
    return { items };
  }
}
