import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ClienteSedeDto } from './dto/cliente-sede.dto';
import { AsignarPuestoDto } from './dto/asignar-puesto.dto';
import { QueryClientesDto } from './dto/query-clientes.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Crea un nuevo cliente.
   * @param createClienteDto - Datos del cliente a crear.
   * @returns Cliente creado con sus relaciones (empresa, sedes, puestos).
   */
  async create(createClienteDto: CreateClienteDto) {
    // Verificar que la empresa exista
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createClienteDto.id_empresa) }
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.clientes.create({
      data: {
        id_empresa: BigInt(createClienteDto.id_empresa),
        nombres: createClienteDto.nombres,
        apellidos: createClienteDto.apellidos,
        apodo: createClienteDto.apodo,
        telefono: createClienteDto.telefono,
        observaciones: createClienteDto.observaciones,
        estado: createClienteDto.estado ?? true,
      },
      include: {
        empresas: true,
        cliente_sede: { include: { sedes: true } },
        clientes_puestos: { include: { puestos: true } }
      }
    });
  }

  /**
   * Obtiene todos los clientes (sin paginación). Útil para selects o exportaciones.
   * @param buscar - Texto opcional para filtrar por nombre, apellido, apodo o teléfono.
   * @returns Lista completa de clientes.
   */
  async findAll(buscar?: string) {
    const where: any = {};
    if (buscar) {
      where.OR = [
        { nombres: { contains: buscar, mode: 'insensitive' } },
        { apellidos: { contains: buscar, mode: 'insensitive' } },
        { apodo: { contains: buscar, mode: 'insensitive' } },
        { telefono: { contains: buscar, mode: 'insensitive' } },
      ];
    }
    return this.prisma.clientes.findMany({
      where,
      include: {
        empresas: true,

        cliente_sede: { include: { sedes: true } },
        clientes_puestos: { include: { puestos: true } }
      },
      orderBy: { id_cliente: 'asc' }
    });
  }

  /**
   * Obtiene clientes con paginación y filtros. Es el método principal para la tabla.
   * @param query - Parámetros de paginación (page, limit), búsqueda y estado.
   * @returns Objeto con data, total, page, limit, totalPages.
   */
  async findAllPaginated(query: QueryClientesDto) {
    const { page = 1, limit = 10, buscar, estado = 'todos' } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    if (buscar) {
      where.OR = [
        { nombres: { contains: buscar, mode: 'insensitive' } },
        { apellidos: { contains: buscar, mode: 'insensitive' } },
        { apodo: { contains: buscar, mode: 'insensitive' } },
        { telefono: { contains: buscar, mode: 'insensitive' } },
      ];
    }

    if (estado !== 'todos') {
      where.estado = estado === 'true';
    }

    const [data, total] = await Promise.all([
      this.prisma.clientes.findMany({
        where,
        include: {
          empresas: true,
          cliente_sede: { include: { sedes: true } },
          clientes_puestos: {
            include: {
              puestos: {
                include: {
                  lugares_operativos: true   // ✅ incluye tipo_lugar y otros campos
                }
              }
            }
          }
        },
        orderBy: { id_cliente: 'asc' },
        skip,
        take,
      }),
      this.prisma.clientes.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtiene un cliente por su ID con todas sus relaciones.
   * @param id - ID del cliente.
   * @returns Cliente encontrado.
   */
  async findOne(id: number) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: BigInt(id) },
      include: {
        empresas: true,
        cliente_sede: { include: { sedes: true } },
        clientes_puestos: { include: { puestos: true } }
      }
    });
    if (!cliente) throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    return cliente;
  }

  /**
   * Actualiza los datos de un cliente.
   * @param id - ID del cliente a actualizar.
   * @param updateClienteDto - Datos a modificar.
   * @returns Cliente actualizado.
   */
  async update(id: number, updateClienteDto: UpdateClienteDto) {
    try {
      const updated = await this.prisma.clientes.update({
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
        include: {
          empresas: true,
          cliente_sede: { include: { sedes: true } },
          clientes_puestos: { include: { puestos: true } }
        }
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      throw error;
    }
  }

  /**
   * "Elimina" un cliente cambiando su estado a false (soft delete).
   * @param id - ID del cliente.
   * @returns Cliente actualizado con estado false.
   */
  async remove(id: number) {
    try {
      const updated = await this.prisma.clientes.update({
        where: { id_cliente: BigInt(id) },
        data: { estado: false }
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      throw error;
    }
  }

  // ------------------------------------------------------------
  // GESTIÓN DE SEDES ASOCIADAS AL CLIENTE (CLIENTE_SEDE)
  // ------------------------------------------------------------

  /**
   * Asocia una sede a un cliente (crea un registro en cliente_sede).
   * @param dto - Objeto con id_cliente, id_sede, tipo_relacion.
   * @returns Relación creada con los datos de cliente y sede.
   */
  async associateSede(dto: ClienteSedeDto) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: BigInt(dto.id_cliente) }
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const sede = await this.prisma.sedes.findUnique({
      where: { id_sede: BigInt(dto.id_sede) }
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');

    // Evitar duplicados exactos (mismo cliente, misma sede, mismo tipo)
    const existing = await this.prisma.cliente_sede.findFirst({
      where: {
        id_cliente: BigInt(dto.id_cliente),
        id_sede: BigInt(dto.id_sede),
        tipo_relacion: dto.tipo_relacion
      }
    });
    if (existing) throw new ConflictException('Esta relación cliente-sede ya existe');

    return this.prisma.cliente_sede.create({
      data: {
        id_cliente: BigInt(dto.id_cliente),
        id_sede: BigInt(dto.id_sede),
        id_empresa: cliente.id_empresa,
        tipo_relacion: dto.tipo_relacion,
        estado: true   // siempre activa al crearse
      },
      include: { clientes: true, sedes: true }
    });
  }

  /**
   * Obtiene todas las sedes activas asociadas a un cliente.
   * @param id - ID del cliente.
   * @returns Lista de relaciones cliente_sede (con estado true).
   */
  async getSedesByCliente(id: number) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: BigInt(id) },
      include: {
        cliente_sede: {
          where: { estado: true },
          include: { sedes: true }
        }
      }
    });
    if (!cliente) throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    return cliente.cliente_sede;
  }

  /**
   * Actualiza el tipo de relación (emisor/receptor/ambos) de una sede ya asociada.
   * @param clienteId - ID del cliente.
   * @param sedeId - ID de la sede.
   * @param tipoRelacion - Nuevo tipo de relación.
   * @returns Relación actualizada.
   */
  async updateSedeRelacion(clienteId: number, sedeId: number, tipoRelacion: string) {
    const valoresValidos = ['emisor', 'receptor', 'ambos'];
    if (!valoresValidos.includes(tipoRelacion)) {
      throw new ConflictException('tipo_relacion debe ser: emisor, receptor o ambos');
    }

    const relation = await this.prisma.cliente_sede.findFirst({
      where: {
        id_cliente: BigInt(clienteId),
        id_sede: BigInt(sedeId),
        estado: true,
      },
    });

    if (!relation) {
      throw new NotFoundException('Relación cliente-sede no encontrada');
    }

    return this.prisma.cliente_sede.update({
      where: { id_cliente_sede: relation.id_cliente_sede },
      data: { tipo_relacion: tipoRelacion },
      include: { clientes: true, sedes: true },
    });
  }

  /**
   * ELIMINA FÍSICAMENTE la relación entre un cliente y una sede (hard delete).
   * Ya no solo cambia estado a false, sino que borra el registro de la tabla.
   * Esto es lo ideal para este caso porque la relación es simplemente una asociación
   * sin dependencias externas (no hay otras tablas que referencien a cliente_sede).
   *
   * @param clienteId - ID del cliente.
   * @param sedeId - ID de la sede.
   * @returns La relación eliminada (o null si no existía).
   */
  async removeSede(clienteId: number, sedeId: number) {
    // Buscar la relación activa (estado true)
    const relation = await this.prisma.cliente_sede.findFirst({
      where: {
        id_cliente: BigInt(clienteId),
        id_sede: BigInt(sedeId),
        estado: true,
      },
    });

    if (!relation) {
      throw new NotFoundException('Relación cliente-sede no encontrada');
    }

    // Eliminar físicamente el registro (no solo actualizar estado)
    return this.prisma.cliente_sede.delete({
      where: { id_cliente_sede: relation.id_cliente_sede },
    });
  }

  // ------------------------------------------------------------
  // GESTIÓN DE PUESTOS ASOCIADOS AL CLIENTE (CLIENTES_PUESTOS)
  // ------------------------------------------------------------

  /**
   * Asigna un puesto a un cliente (crea un registro en clientes_puestos).
   * @param clienteId - ID del cliente.
   * @param dto - Objeto con id_puesto y fecha_inicio opcional.
   * @returns Relación creada.
   */
  async assignPuesto(clienteId: number, dto: AsignarPuestoDto) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: BigInt(clienteId) }
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const puesto = await this.prisma.puestos.findUnique({
      where: { id_puesto: BigInt(dto.id_puesto) }
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');

    // Evitar duplicados activos (sin fecha_fin)
    const existing = await this.prisma.clientes_puestos.findFirst({
      where: {
        id_cliente: BigInt(clienteId),
        id_puesto: BigInt(dto.id_puesto),
        fecha_fin: null
      }
    });
    if (existing) throw new ConflictException('El cliente ya tiene este puesto activo');

    return this.prisma.clientes_puestos.create({
      data: {
        id_cliente: BigInt(clienteId),
        id_puesto: BigInt(dto.id_puesto),
        id_empresa: cliente.id_empresa,
        fecha_inicio: new Date(), // ✅ siempre la fecha actual
        estado: true,
        seccion: dto.seccion ?? null, // 👈 agregado
      },
      include: { puestos: true }
    });
  }
  /**
   * Elimina (soft delete) la asignación de un puesto a un cliente, estableciendo fecha_fin y estado false.
   * @param clienteId - ID del cliente.
   * @param puestoId - ID del puesto.
   * @returns Relación actualizada con fecha_fin.
   */
  async removePuesto(clienteId: number, puestoId: number) {
    const relation = await this.prisma.clientes_puestos.findFirst({
      where: {
        id_cliente: BigInt(clienteId),
        id_puesto: BigInt(puestoId),
        fecha_fin: null
      }
    });
    if (!relation) throw new NotFoundException('Relación cliente-puesto no encontrada o ya finalizada');

    // Eliminar físicamente el registro
    return this.prisma.clientes_puestos.delete({
      where: { id_cliente_puesto: relation.id_cliente_puesto }
    });
  }

  /**
   * Obtiene los puestos activos actualmente asignados a un cliente.
   * @param clienteId - ID del cliente.
   * @returns Lista de relaciones clientes_puestos (con fecha_fin null).
   */
  async getPuestosByCliente(clienteId: number) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: BigInt(clienteId) },
      include: {
        clientes_puestos: {
          where: { fecha_fin: null, estado: true },
          include: { puestos: true }
        }
      }
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente.clientes_puestos;
  }

  async findAllClientesPuestos() {
    return this.prisma.clientes_puestos.findMany({
      where: { estado: true }, // solo activas
      include: {
        clientes: {
          select: { id_cliente: true, nombres: true, apellidos: true, telefono: true }
        },
        puestos: {
          include: {
            lugares_operativos: {
              include: { sedes: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

}