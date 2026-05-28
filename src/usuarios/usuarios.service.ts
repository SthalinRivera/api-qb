// src/usuarios/usuarios.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createUsuarioDto: CreateUsuarioDto) {
    // Verificar que la empresa existe
    const empresa = await this.prisma.empresas.findUnique({
      where: { id_empresa: BigInt(createUsuarioDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    // Si se envió sede, verificar que pertenece a la empresa
    if (createUsuarioDto.id_sede) {
      const sede = await this.prisma.sedes.findFirst({
        where: {
          id_sede: BigInt(createUsuarioDto.id_sede),
          id_empresa: BigInt(createUsuarioDto.id_empresa),
        },
      });
      if (!sede) throw new NotFoundException('Sede no pertenece a la empresa');
    }

    return this.prisma.usuarios.create({
      data: {
        nombres: createUsuarioDto.nombres,
        apellidos: createUsuarioDto.apellidos,
        telefono: createUsuarioDto.telefono,
        email: createUsuarioDto.email,
        google_uid: createUsuarioDto.google_uid,
        avatar_url: createUsuarioDto.avatar_url,
        estado_acceso: createUsuarioDto.estado_acceso ?? 'activo',
        estado: createUsuarioDto.estado ?? true,
        id_empresa: BigInt(createUsuarioDto.id_empresa),
        id_sede: createUsuarioDto.id_sede ? BigInt(createUsuarioDto.id_sede) : undefined,
      },
    });
  }

  async findAll() {
    return this.prisma.usuarios.findMany({
      include: {
        empresas: true,
        sedes: true,
        usuarios_roles: {
          include: { roles_usuarios: true },
        },
      },
      orderBy: { id_usuario: 'asc' },
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id_usuario: BigInt(id) },
      include: {
        empresas: true,
        sedes: true,
        usuarios_roles: {
          include: { roles_usuarios: true },
        },
      },
    });
    if (!usuario) throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    try {
      // Si actualiza empresa o sede, validar relaciones
      if (updateUsuarioDto.id_empresa) {
        const empresa = await this.prisma.empresas.findUnique({
          where: { id_empresa: BigInt(updateUsuarioDto.id_empresa) },
        });
        if (!empresa) throw new NotFoundException('Empresa no encontrada');
      }
      if (updateUsuarioDto.id_sede && updateUsuarioDto.id_empresa) {
        const sede = await this.prisma.sedes.findFirst({
          where: {
            id_sede: BigInt(updateUsuarioDto.id_sede),
            id_empresa: BigInt(updateUsuarioDto.id_empresa),
          },
        });
        if (!sede) throw new NotFoundException('Sede no pertenece a la empresa');
      }

      const updated = await this.prisma.usuarios.update({
        where: { id_usuario: BigInt(id) },
        data: {
          nombres: updateUsuarioDto.nombres,
          apellidos: updateUsuarioDto.apellidos,
          telefono: updateUsuarioDto.telefono,
          email: updateUsuarioDto.email,
          google_uid: updateUsuarioDto.google_uid,
          avatar_url: updateUsuarioDto.avatar_url,
          estado_acceso: updateUsuarioDto.estado_acceso,
          estado: updateUsuarioDto.estado,
          id_empresa: updateUsuarioDto.id_empresa ? BigInt(updateUsuarioDto.id_empresa) : undefined,
          id_sede: updateUsuarioDto.id_sede ? BigInt(updateUsuarioDto.id_sede) : undefined,
        },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      // Primero eliminamos las relaciones en usuarios_roles (si las hay)
      await this.prisma.usuarios_roles.deleteMany({
        where: { id_usuario: BigInt(id) },
      });
      // Luego eliminamos el usuario
      const deleted = await this.prisma.usuarios.delete({
        where: { id_usuario: BigInt(id) },
      });
      return deleted;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
      throw error;
    }
  }

  async bloquearAcceso(id: number) {
    try {
      const updated = await this.prisma.usuarios.update({
        where: { id_usuario: BigInt(id) },
        data: { estado_acceso: 'bloqueado' },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
      throw error;
    }
  }

  async activarAcceso(id: number) {
    try {
      const updated = await this.prisma.usuarios.update({
        where: { id_usuario: BigInt(id) },
        data: { estado_acceso: 'activo' },
      });
      return updated;
    } catch (error) {
      if (error.code === 'P2025') throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
      throw error;
    }
  }


  async assignRole(usuarioId: number, rolId: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id_usuario: BigInt(usuarioId) }
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const rol = await this.prisma.roles_usuarios.findUnique({
      where: { id_rol_usuario: BigInt(rolId) }
    });
    if (!rol) throw new NotFoundException('Rol no encontrado');

    const existing = await this.prisma.usuarios_roles.findFirst({
      where: {
        id_usuario: BigInt(usuarioId),
        id_rol_usuario: BigInt(rolId)
      }
    });
    if (existing) throw new BadRequestException('El usuario ya tiene este rol');

    return this.prisma.usuarios_roles.create({
      data: {
        id_usuario: BigInt(usuarioId),
        id_rol_usuario: BigInt(rolId)
      }
    });
  }

  async removeRole(usuarioId: number, rolId: number) {
    const relation = await this.prisma.usuarios_roles.findFirst({
      where: {
        id_usuario: BigInt(usuarioId),
        id_rol_usuario: BigInt(rolId)
      }
    });
    if (!relation) throw new NotFoundException('Relación usuario-rol no encontrada');

    return this.prisma.usuarios_roles.delete({
      where: { id_usuario_rol: relation.id_usuario_rol }
    });
  }

  async getRolesByUser(usuarioId: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id_usuario: BigInt(usuarioId) },
      include: {
        usuarios_roles: {
          include: { roles_usuarios: true }
        }
      }
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario.usuarios_roles.map(ur => ur.roles_usuarios);
  }
}