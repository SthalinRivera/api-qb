import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateRolDto } from './dto/create-roles-usuario.dto';
import { UpdateRolDto } from './dto/update-roles-usuario.dto';

@Injectable()
export class RolesUsuariosService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createRolDto: CreateRolDto) {
    return this.prisma.scoped.roles_usuarios.create({
      data: {
        nombre: createRolDto.nombre,
        descripcion: createRolDto.descripcion,
        estado: createRolDto.estado ?? true,
      },
    });
  }

  async findAll(estado?: boolean) {
    const where: any = {};
    if (estado !== undefined) where.estado = estado;
    return this.prisma.scoped.roles_usuarios.findMany({
      where,
      orderBy: { id_rol_usuario: 'asc' },
      include: { usuarios_roles: true },
    });
  }

  async findOne(id: number) {
    const rol = await this.prisma.scoped.roles_usuarios.findUnique({
      where: { id_rol_usuario: BigInt(id) },
      include: { usuarios_roles: true },
    });
    if (!rol) throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    return rol;
  }

  async update(id: number, updateRolDto: UpdateRolDto) {
    try {
      const updated = await this.prisma.scoped.roles_usuarios.update({
        where: { id_rol_usuario: BigInt(id) },
        data: {
          nombre: updateRolDto.nombre,
          descripcion: updateRolDto.descripcion,
          estado: updateRolDto.estado,
        },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Rol con ID ${id} no encontrado`);
      throw error;
    }
  }

  async changeState(id: number, estado: boolean) {
    return this.update(id, { estado });
  }
}