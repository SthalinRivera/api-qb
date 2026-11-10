import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ClienteSedeDto } from './dto/cliente-sede.dto';
import { AsignarPuestoDto } from './dto/asignar-puesto.dto';
import { QueryClientesDto } from './dto/query-clientes.dto';
import { PaginatedResult } from './interfaces/paginated-result.interface';
import { Prisma } from '@prisma/client';
import { UpdateFullClienteDto } from './dto/update-full-cliente.dto';
import { CreateFullClienteDto } from './dto/create-full-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) { }

  // ==================== CRUD BÁSICO ====================

  async create(createClienteDto: CreateClienteDto) {
    await this.ensureEmpresaExists(createClienteDto.id_empresa);
    await this.ensureUniqueClienteNombre(
      createClienteDto.id_empresa,
      createClienteDto.nombres,
    );
    await this.ensureUniqueTelefono(createClienteDto.telefono);
    return this.prisma.scoped.clientes.create({
      data: {
        id_empresa: BigInt(createClienteDto.id_empresa),
        nombres: createClienteDto.nombres,
        apellidos: createClienteDto.apellidos,
        apodo: createClienteDto.apodo,
        telefono: createClienteDto.telefono,
        observaciones: createClienteDto.observaciones,
        estado: createClienteDto.estado ?? true,
      },
      include: this.getClienteInclude(),
    });
  }
  async createFull(dto: CreateFullClienteDto) {
    // ✅ Validaciones previas (antes de la transacción)
    await this.ensureEmpresaExists(dto.id_empresa);
    await this.ensureUniqueClienteNombre(dto.id_empresa, dto.nombres);
    await this.ensureUniqueTelefono(dto.telefono);

    return this.prisma.scoped.$transaction(async (tx) => {
      // Crear cliente (ya validado)
      const cliente = await tx.clientes.create({
        data: {
          id_empresa: BigInt(dto.id_empresa),
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          apodo: dto.apodo,
          telefono: dto.telefono,
          observaciones: dto.observaciones,
          estado: dto.estado ?? true,
        },
      });

      // Asignar sedes
      if (dto.sedes?.length) {
        for (const s of dto.sedes) {
          await tx.cliente_sede.create({
            data: {
              id_cliente: cliente.id_cliente,
              id_sede: BigInt(s.id_sede),
              id_empresa: cliente.id_empresa,
              tipo_relacion: s.tipo_relacion,
              id_ubigeo: s.id_ubigeo,
              estado: true,
            },
          });
        }
      }

      // Asignar puestos (validando ocupación global)
      if (dto.puestos?.length) {
        for (const p of dto.puestos) {
          const ocupado = await tx.clientes_puestos.findFirst({
            where: {
              id_puesto: BigInt(p.id_puesto),
              seccion: p.seccion ?? null,
              fecha_fin: null,
            },
          });
          if (ocupado) {
            throw new ConflictException(
              `El puesto ${p.id_puesto} en la sección ${p.seccion} ya está ocupado por otro cliente`
            );
          }
          await tx.clientes_puestos.create({
            data: {
              id_cliente: cliente.id_cliente,
              id_puesto: BigInt(p.id_puesto),
              id_empresa: cliente.id_empresa,
              seccion: p.seccion,
              fecha_inicio: new Date(),
              estado: true,
            },
          });
        }
      }

      // Retornar el cliente con relaciones (usando tx)
      return tx.clientes.findUnique({
        where: { id_cliente: cliente.id_cliente },
        include: this.getClienteInclude(),
      });
    });
  }

  async updateFull(id: number, dto: UpdateFullClienteDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
      // 1. Verificar que el cliente existe
      const clienteExistente = await tx.clientes.findUnique({
        where: { id_cliente: BigInt(id) },
      });
      if (!clienteExistente) throw new NotFoundException(`Cliente con ID ${id} no encontrado`);

      // 2. Si se cambia la empresa o los nombres, validar unicidad (excluyendo este id)
      if (dto.id_empresa || dto.nombres || dto.apellidos) {
        const newEmpresa = dto.id_empresa ?? Number(clienteExistente.id_empresa);
        const newNombres = dto.nombres ?? clienteExistente.nombres;
        const newApellidos = dto.apellidos ?? clienteExistente.apellidos ?? undefined;
        await this.ensureUniqueClienteNombre(newEmpresa, newNombres, id);
      }

      // 3. Actualizar datos básicos
      await tx.clientes.update({
        where: { id_cliente: BigInt(id) },
        data: {
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          apodo: dto.apodo,
          telefono: dto.telefono,
          observaciones: dto.observaciones,
          estado: dto.estado,
          id_empresa: dto.id_empresa ? BigInt(dto.id_empresa) : undefined,
        },
      });

      // 4. Reemplazar sedes
      if (dto.sedes !== undefined) {
        // Eliminar todas las sedes actuales (físicamente o con soft delete)
        await tx.cliente_sede.deleteMany({
          where: { id_cliente: BigInt(id) },
        });
        // Crear las nuevas sedes
        for (const s of dto.sedes) {
          await tx.cliente_sede.create({
            data: {
              id_cliente: BigInt(id),
              id_sede: BigInt(s.id_sede),
              id_empresa: clienteExistente.id_empresa,
              tipo_relacion: s.tipo_relacion,
              id_ubigeo: s.id_ubigeo,
              estado: true,
            },
          });
        }
      }

      if (dto.puestos !== undefined) {
        await tx.$queryRaw`SELECT id_cliente FROM clientes WHERE id_cliente = ${BigInt(id)} FOR UPDATE`;
        const actuales = await tx.clientes_puestos.findMany({ where: { id_cliente: BigInt(id), estado: true, fecha_fin: null } });
        const key = (p: { id_puesto: bigint | number; seccion?: string | null }) => `${p.id_puesto}:${p.seccion || ''}`;
        const nuevos = new Set(dto.puestos.map(key));
        if (nuevos.size !== dto.puestos.length) throw new ConflictException('Puestos duplicados en la solicitud.');
        for (const anterior of actuales) if (!nuevos.has(key(anterior))) await tx.clientes_puestos.update({ where: { id_cliente_puesto: anterior.id_cliente_puesto }, data: { estado: false, fecha_fin: new Date() } });
        for (const puesto of dto.puestos) {
          if (actuales.some((actual) => key(actual) === key(puesto))) continue;
          await tx.$queryRaw`SELECT id_puesto FROM puestos WHERE id_puesto = ${BigInt(puesto.id_puesto)} FOR UPDATE`;
          if (await tx.clientes_puestos.findFirst({ where: { id_puesto: puesto.id_puesto, seccion: puesto.seccion || null, estado: true, fecha_fin: null } })) throw new ConflictException('El puesto y sección ya están ocupados.');
          await tx.clientes_puestos.create({ data: { id_cliente: id, id_puesto: puesto.id_puesto, seccion: puesto.seccion || null, id_empresa: clienteExistente.id_empresa, fecha_inicio: new Date(), estado: true } });
        }
      }

      // Retornar el cliente actualizado con relaciones
      return tx.clientes.findUnique({
        where: { id_cliente: BigInt(id) },
        include: this.getClienteInclude(),
      });
    });
  }
  async findAll(buscar?: string, query?: QueryClientesDto) {
    const where = this.buildListWhere(buscar, query?.estado, query?.tipo_relacion, query?.id_sede);
    return this.prisma.scoped.clientes.findMany({
      where,
      include: this.getClienteInclude(),
      orderBy: { id_cliente: 'desc' },
    });
  }

  async findAllPaginated(query: QueryClientesDto): Promise<PaginatedResult<any> & { activos: number; inactivos: number }> {
    const { page = 1, limit = 10, buscar, estado = 'todos', tipo_relacion = 'todos', id_sede } = query;
    const skip = (page - 1) * limit;

    const where = this.buildListWhere(buscar, estado, tipo_relacion, id_sede);

    const [data, total, activos, inactivos] = await Promise.all([
      this.prisma.scoped.clientes.findMany({
        where,
        include: this.getClienteIncludeForList(),
        orderBy: { id_cliente: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.scoped.clientes.count({ where }),
      this.prisma.scoped.clientes.count({ where: { ...this.buildListWhere(buscar, undefined, tipo_relacion, id_sede), estado: true } }),
      this.prisma.scoped.clientes.count({ where: { ...this.buildListWhere(buscar, undefined, tipo_relacion, id_sede), estado: false } }),
    ]);

    return {
      data,
      total,
      activos,
      inactivos,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const cliente = await this.prisma.scoped.clientes.findUnique({
      where: { id_cliente: BigInt(id) },
      include: this.getClienteInclude(),
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return cliente;
  }

  async update(id: number, updateClienteDto: UpdateClienteDto) {
    await this.ensureClienteExists(id);

    if (updateClienteDto.id_empresa || updateClienteDto.nombres || updateClienteDto.apellidos) {
      const current = await this.prisma.scoped.clientes.findUnique({
        where: { id_cliente: BigInt(id) },
        select: { id_empresa: true, nombres: true, apellidos: true },
      });
      if (!current) {
        throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      }
      const newEmpresa = updateClienteDto.id_empresa ?? Number(current.id_empresa);
      const newNombres = updateClienteDto.nombres ?? current.nombres;
      const newApellidos = updateClienteDto.apellidos ?? current.apellidos ?? undefined;
      await this.ensureUniqueClienteNombre(newEmpresa, newNombres, id);
    }
    if (updateClienteDto.telefono !== undefined) {
      await this.ensureUniqueTelefono(updateClienteDto.telefono, id);
    }
    try {
      return await this.prisma.scoped.clientes.update({
        where: { id_cliente: BigInt(id) },
        data: {
          nombres: updateClienteDto.nombres,
          apellidos: updateClienteDto.apellidos,
          apodo: updateClienteDto.apodo,
          telefono: updateClienteDto.telefono,
          observaciones: updateClienteDto.observaciones,
          estado: updateClienteDto.estado,
          id_empresa: updateClienteDto.id_empresa ? BigInt(updateClienteDto.id_empresa) : undefined,
        },
        include: this.getClienteInclude(),
      });
    } catch (error) {
      this.handlePrismaError(error, id);
    }
  }

  async changeState(id: number, estado: boolean) {
    await this.ensureClienteExists(id);
    return this.prisma.scoped.clientes.update({
      where: { id_cliente: BigInt(id) },
      data: { estado },
      include: this.getClienteInclude(),
    });
  }

  // ==================== GESTIÓN DE SEDES ====================

  async associateSede(dto: ClienteSedeDto) {
    await this.ensureClienteExists(dto.id_cliente);
    await this.ensureSedeExists(dto.id_sede);

    const existing = await this.prisma.scoped.cliente_sede.findFirst({
      where: {
        id_cliente: BigInt(dto.id_cliente),
        id_sede: BigInt(dto.id_sede),
        tipo_relacion: dto.tipo_relacion,
      },
    });
    if (existing) {
      throw new ConflictException('Esta relación cliente-sede ya existe');
    }

    const cliente = await this.prisma.scoped.clientes.findUnique({
      where: { id_cliente: BigInt(dto.id_cliente) },
      select: { id_empresa: true },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${dto.id_cliente} no encontrado`);
    }

    return this.prisma.scoped.cliente_sede.create({
      data: {
        id_cliente: BigInt(dto.id_cliente),
        id_sede: BigInt(dto.id_sede),
        id_empresa: cliente.id_empresa,
        tipo_relacion: dto.tipo_relacion,
        id_ubigeo: dto.id_ubigeo,
        estado: true,
      },
      include: { clientes: true, sedes: true },
    });
  }

  async getSedesByCliente(id: number) {
    await this.ensureClienteExists(id);
    const cliente = await this.prisma.scoped.clientes.findUnique({
      where: { id_cliente: BigInt(id) },
      include: {
        cliente_sede: {
          where: { estado: true },
          include: { sedes: true },
        },
      },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return cliente.cliente_sede;
  }

  async updateSedeRelacion(clienteId: number, sedeId: number, tipoRelacion: string) {
    const validTypes = ['emisor', 'receptor', 'ambos'];
    if (!validTypes.includes(tipoRelacion)) {
      throw new BadRequestException('tipo_relacion debe ser: emisor, receptor o ambos');
    }

    const relation = await this.prisma.scoped.cliente_sede.findFirst({
      where: {
        id_cliente: BigInt(clienteId),
        id_sede: BigInt(sedeId),
        estado: true,
      },
    });
    if (!relation) {
      throw new NotFoundException('Relación cliente-sede no encontrada');
    }

    return this.prisma.scoped.cliente_sede.update({
      where: { id_cliente_sede: relation.id_cliente_sede },
      data: { tipo_relacion: tipoRelacion },
      include: { clientes: true, sedes: true },
    });
  }

  async removeSede(clienteId: number, sedeId: number) {
    const relation = await this.prisma.scoped.cliente_sede.findFirst({
      where: {
        id_cliente: BigInt(clienteId),
        id_sede: BigInt(sedeId),
        estado: true,
      },
    });
    if (!relation) {
      throw new NotFoundException('Relación cliente-sede no encontrada');
    }

    return this.prisma.scoped.cliente_sede.delete({
      where: { id_cliente_sede: relation.id_cliente_sede },
    });
  }

  // ==================== GESTIÓN DE PUESTOS ====================

  async assignPuesto(clienteId: number, dto: AsignarPuestoDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id_cliente FROM clientes WHERE id_cliente = ${BigInt(clienteId)} FOR UPDATE`;
    await tx.$queryRaw`SELECT id_puesto FROM puestos WHERE id_puesto = ${BigInt(dto.id_puesto)} FOR UPDATE`;

    await this.ensureClienteExists(clienteId);
    await this.ensurePuestoExists(dto.id_puesto);

    const existingGlobal = await tx.clientes_puestos.findFirst({
      where: {
        id_puesto: BigInt(dto.id_puesto),
        seccion: dto.seccion ?? null,
        fecha_fin: null,
      },
    });
    if (existingGlobal) {
      const ocupante =
        existingGlobal.id_cliente === BigInt(clienteId)
          ? 'este cliente'
          : `el cliente ${existingGlobal.id_cliente}`;
      throw new ConflictException(
        `El puesto ${dto.id_puesto} en la sección ${dto.seccion} ya está asignado a ${ocupante}`,
      );
    }

    const cliente = await tx.clientes.findUnique({
      where: { id_cliente: BigInt(clienteId) },
      select: { id_empresa: true },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${clienteId} no encontrado`);
    }

    return tx.clientes_puestos.create({
      data: {
        id_cliente: BigInt(clienteId),
        id_puesto: BigInt(dto.id_puesto),
        id_empresa: cliente.id_empresa,
        fecha_inicio: new Date(),
        estado: true,
        seccion: dto.seccion ?? null,
      },
      include: { puestos: true },
    });
    });
  }

  async removePuesto(clienteId: number, puestoId: number, ocupacionId?: number) {
    return this.prisma.scoped.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_puesto FROM puestos WHERE id_puesto = ${BigInt(puestoId)} FOR UPDATE`;
      const relaciones = await tx.clientes_puestos.findMany({ where: { id_cliente: clienteId, id_puesto: puestoId, id_cliente_puesto: ocupacionId, estado: true, fecha_fin: null } });
      if (!relaciones.length) throw new NotFoundException('Ocupación vigente no encontrada.');
      if (relaciones.length !== 1) throw new ConflictException('Hay varias secciones; indica id_cliente_puesto.');
      return tx.clientes_puestos.update({ where: { id_cliente_puesto: relaciones[0].id_cliente_puesto }, data: { estado: false, fecha_fin: new Date() } });
    });
  }

  async getPuestosByCliente(clienteId: number) {
    await this.ensureClienteExists(clienteId);
    const cliente = await this.prisma.scoped.clientes.findUnique({
      where: { id_cliente: BigInt(clienteId) },
      include: {
        clientes_puestos: {
          where: { fecha_fin: null, estado: true },
          select: {
            id_cliente_puesto: true,
            fecha_inicio: true,
            seccion: true,
            puestos: {
              include: {
                lugares_operativos: {
                  include: { sedes: true },
                },
              },
            },
          },
        },
      },
    });
    if (!cliente) throw new NotFoundException(`Cliente ${clienteId} no encontrado`);
    // Retornar un array plano con seccion y puestos
    return cliente.clientes_puestos.map(cp => ({
      id_cliente_puesto: cp.id_cliente_puesto,
      fecha_inicio: cp.fecha_inicio,
      seccion: cp.seccion,
      puestos: cp.puestos
    }));
  }

  async findAllClientesPuestos() {
    return this.prisma.scoped.clientes_puestos.findMany({
      where: { estado: true, fecha_fin: null },
      include: {
        clientes: {
          select: { id_cliente: true, nombres: true, apellidos: true, telefono: true },
        },
        puestos: {
          include: {
            lugares_operativos: {
              include: { sedes: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ==================== MÉTODOS PRIVADOS AUXILIARES ====================

  private async ensureEmpresaExists(empresaId: number) {
    const empresa = await this.prisma.scoped.empresas.findUnique({
      where: { id_empresa: BigInt(empresaId) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
  }

  private async ensureSedeExists(sedeId: number) {
    const sede = await this.prisma.scoped.sedes.findUnique({
      where: { id_sede: BigInt(sedeId) },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');
  }

  private async ensurePuestoExists(puestoId: number) {
    const puesto = await this.prisma.scoped.puestos.findUnique({
      where: { id_puesto: BigInt(puestoId) },
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');
  }

  private async ensureClienteExists(id: number) {
    const cliente = await this.prisma.scoped.clientes.findUnique({
      where: { id_cliente: BigInt(id) },
    });
    if (!cliente) throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
  }

  private async ensureUniqueClienteNombre(
    empresaId: number,
    nombres: string,
    excludeId?: number,
  ) {
    const where: Prisma.clientesWhereInput = {
      id_empresa: BigInt(empresaId),
      nombres: nombres,
    };
    if (excludeId) {
      where.id_cliente = { not: BigInt(excludeId) };
    }
    const existing = await this.prisma.scoped.clientes.findFirst({ where });
    if (existing) {
      throw new ConflictException(
        `Ya existe un cliente con el nombre "${nombres}" en esta empresa`
      );
    }
  }

  private buildSearchWhere(buscar?: string): Prisma.clientesWhereInput {
    if (!buscar) return {};
    return {
      OR: [
        { nombres: { contains: buscar, mode: 'insensitive' } },
        { apellidos: { contains: buscar, mode: 'insensitive' } },
        { apodo: { contains: buscar, mode: 'insensitive' } },
        { telefono: { contains: buscar, mode: 'insensitive' } },
      ],
    };
  }

  private buildListWhere(
    buscar?: string,
    estado?: string,
    tipoRelacion?: string,
    sedeId?: number,
  ): Prisma.clientesWhereInput {
    const where: Prisma.clientesWhereInput = this.buildSearchWhere(buscar);

    if (estado && estado !== 'todos') {
      where.estado = estado === 'true';
    }
    if (sedeId || (tipoRelacion && tipoRelacion !== 'todos')) {
      where.cliente_sede = { some: { estado: true, id_sede: sedeId,
        ...(tipoRelacion && tipoRelacion !== 'todos' ? { tipo_relacion: { in: tipoRelacion === 'ambos' ? ['ambos'] : [tipoRelacion, 'ambos'] } } : {}),
      } };
    }
    return where;
  }

  private getClienteInclude() {
    return {
      empresas: true,
      cliente_sede: { include: { sedes: true } },
      clientes_puestos: { include: { puestos: true } },
    };
  }

  private getClienteIncludeForList() {
    return {
      empresas: true,
      cliente_sede: { include: { sedes: true } },
      clientes_puestos: {
        include: {
          puestos: {
            include: {
              lugares_operativos: true,
            },
          },
        },
      },
    };
  }

  private handlePrismaError(error: any, id?: number) {
    if (error.code === 'P2025') {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    if (error.code === 'P2002') {
      throw new ConflictException('Ya existe un registro con esos datos únicos');
    }
    throw error;
  }
  private async ensureUniqueTelefono(
    telefono: string | null | undefined,
    excludeId?: number,
  ) {
    if (!telefono) return; // si es null o undefined, no hay restricción

    const where: Prisma.clientesWhereInput = { telefono };
    if (excludeId) {
      where.id_cliente = { not: BigInt(excludeId) };
    }
    const existing = await this.prisma.scoped.clientes.findFirst({ where });
    if (existing) {
      throw new ConflictException(
        `El teléfono "${telefono}" ya está registrado por otro cliente.`,
      );
    }
  }
}