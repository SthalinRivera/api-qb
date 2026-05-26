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
    // Desactivar usuario (soft delete), no eliminar físicamente
    try {
      const updated = await this.prisma.usuarios.update({
        where: { id_usuario: BigInt(id) },
        data: { estado: false },
      });
      return updated;
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
}