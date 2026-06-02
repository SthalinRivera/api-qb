// src/clientes/clientes.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ClienteSedeDto } from './dto/cliente-sede.dto';
import { AsignarPuestoDto } from './dto/asignar-puesto.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createClienteDto: CreateClienteDto) {
    // Verificar que la empresa existe
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createClienteDto.id_empresa) }
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    // Si se envía teléfono, verificar unicidad por empresa? (El schema tiene telefono @unique global, no por empresa)
    // Por ahora lo dejamos, Prisma lanzará error si duplicado.
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

  async findAll(buscar?: string) {
    const where: any = {};
    if (buscar) {
      where.OR = [
        { nombres: { contains: buscar, mode: 'insensitive' } },
        { apellidos: { contains: buscar, mode: 'insensitive' } },
        { apodo: { contains: buscar, mode: 'insensitive' } },
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
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      throw error;
    }
  }

  async remove(id: number) {
    // Soft delete: cambiar estado a false
    try {
      const updated = await this.prisma.clientes.update({
        where: { id_cliente: BigInt(id) },
        data: { estado: false }
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      throw error;
    }
  }

  // Asociar cliente con sede (cliente_sede)
  async associateSede(dto: ClienteSedeDto) {
    // Verificar que el cliente existe
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: BigInt(dto.id_cliente) }
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const sede = await this.prisma.sedes.findUnique({
      where: { id_sede: BigInt(dto.id_sede) }
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');

    // Verificar que no exista ya una relación con el mismo tipo (opcional)
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
        id_empresa: cliente.id_empresa, // la empresa del cliente
        tipo_relacion: dto.tipo_relacion,
        estado: true
      },
      include: { clientes: true, sedes: true }
    });
  }

  async getSedesByCliente(id: number) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: BigInt(id) },
      include: {
        cliente_sede: {
          include: { sedes: true }
        }
      }
    });
    if (!cliente) throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    return cliente.cliente_sede.map(cs => ({
      id_sede: cs.sedes.id_sede,
      nombre: cs.sedes.nombre,
      tipo_relacion: cs.tipo_relacion,
      estado: cs.estado
    }));
  }
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
      data: {
        tipo_relacion: tipoRelacion,
      },
      include: {
        clientes: true,
        sedes: true,
      },
    });
  }

  async removeSede(clienteId: number, sedeId: number) {
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
      data: {
        estado: false,
      },
    });
  }
  // ------------------------------
  // Gestión de puestos (roles) del cliente
  // ------------------------------
  async assignPuesto(clienteId: number, dto: AsignarPuestoDto) {
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: BigInt(clienteId) }
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const puesto = await this.prisma.puestos.findUnique({
      where: { id_puesto: BigInt(dto.id_puesto) }
    });
    if (!puesto) throw new NotFoundException('Puesto no encontrado');

    const existing = await this.prisma.clientes_puestos.findFirst({
      where: {
        id_cliente: BigInt(clienteId),
        id_puesto: BigInt(dto.id_puesto),
        fecha_fin: null // asumimos que si tiene fecha_fin null está activo
      }
    });
    if (existing) throw new ConflictException('El cliente ya tiene este puesto activo');

    return this.prisma.clientes_puestos.create({
      data: {
        id_cliente: BigInt(clienteId),
        id_puesto: BigInt(dto.id_puesto),
        id_empresa: cliente.id_empresa,
        fecha_inicio: dto.fecha_inicio ?? new Date(),
        estado: true
      },
      include: { puestos: true }
    });
  }

  async removePuesto(clienteId: number, puestoId: number) {
    // Soft remove: actualizar fecha_fin
    const relation = await this.prisma.clientes_puestos.findFirst({
      where: {
        id_cliente: BigInt(clienteId),
        id_puesto: BigInt(puestoId),
        fecha_fin: null
      }
    });
    if (!relation) throw new NotFoundException('Relación cliente-puesto no encontrada o ya finalizada');

    return this.prisma.clientes_puestos.update({
      where: { id_cliente_puesto: relation.id_cliente_puesto },
      data: { fecha_fin: new Date(), estado: false }
    });
  }

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
    return cliente.clientes_puestos.map(cp => cp.puestos);
  }
}