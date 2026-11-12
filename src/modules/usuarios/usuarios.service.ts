import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CreateFullUsuarioDto } from './dto/create-usuario-full.dto';
import { UpdateFullUsuarioDto } from './dto/update-full-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) { }

  // ==================== CRUD tradicional ====================
  async create(createUsuarioDto: CreateUsuarioDto) {
    const empresa = await this.prisma.scoped.empresas.findUnique({
      where: { id_empresa: BigInt(createUsuarioDto.id_empresa) },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    if (!createUsuarioDto.id_ubigeo) {
      throw new BadRequestException('La ubicación es obligatoria');
    }

    const sede = await this.prisma.scoped.distritos.findFirst({
      where: {
        id_ubigeo: createUsuarioDto.id_ubigeo,
      },
    });
    if (!sede) throw new NotFoundException('Distrito no encontrado');

    return this.prisma.scoped.usuarios.create({
      data: {
        nombres: createUsuarioDto.nombres,
        apellidos: createUsuarioDto.apellidos,
        telefono: createUsuarioDto.telefono,
        email: createUsuarioDto.email,
        google_uid: createUsuarioDto.google_uid,
        avatar_url: createUsuarioDto.avatar_url,
        estado: createUsuarioDto.estado ?? true,
        id_empresa: BigInt(createUsuarioDto.id_empresa),
        id_ubigeo: createUsuarioDto.id_ubigeo,
      },
    });
  }

  async createFull(dto: CreateFullUsuarioDto) {
    // Validar email único antes de la transacción
    const existingEmail = await this.prisma.scoped.usuarios.findFirst({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('El email ya está registrado');

    // Validar que todos los roles existan (opcional pero recomendado)
    if (dto.roles && dto.roles.length > 0) {
      const rolesExistentes = await this.prisma.scoped.roles_usuarios.findMany({
        where: { id_rol_usuario: { in: dto.roles.map(id => BigInt(id)) } },
      });
      if (rolesExistentes.length !== dto.roles.length) {
        throw new BadRequestException('Uno o más roles no existen');
      }
    }

    return this.prisma.scoped.$transaction(async (tx) => {
      // 1. Validar empresa
      const empresa = await tx.empresas.findUnique({
        where: { id_empresa: BigInt(dto.id_empresa) },
      });
      if (!empresa) throw new NotFoundException('Empresa no encontrada');

      // 2. Validar sede
      const sede = await tx.distritos.findFirst({
        where: {
          id_ubigeo: dto.id_ubigeo,
        },
      });
      if (!sede) throw new NotFoundException('Distrito no encontrado');

      // 3. Crear usuario
      const usuario = await tx.usuarios.create({
        data: {
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          email: dto.email,
          telefono: dto.telefono,
          id_empresa: BigInt(dto.id_empresa),
          id_ubigeo: dto.id_ubigeo,
          estado: dto.estado ?? true,
        },
      });

      // 4. Asignar roles (dentro de la misma transacción)
      await this.syncRoles(tx, usuario.id_usuario, dto.roles);

      // 5. ✅ Retornar el usuario usando tx (NO this.prisma)
      return tx.usuarios.findUnique({
        where: { id_usuario: usuario.id_usuario },
        include: {
          empresas: true,
          distritos: true,
          usuarios_roles: {
            include: { roles_usuarios: true },
          },
        },
      });
    });
  }

  async updateFull(id: number, dto: UpdateFullUsuarioDto) {
    return this.prisma.scoped.$transaction(async (tx) => {
      // Verificar existencia
      const existing = await tx.usuarios.findUnique({
        where: { id_usuario: BigInt(id) },
      });
      if (!existing) throw new NotFoundException(`Usuario ${id} no encontrado`);

      // Validar email único si se cambia
      if (dto.email && dto.email !== existing.email) {
        const emailExists = await tx.usuarios.findFirst({
          where: { email: dto.email, id_usuario: { not: BigInt(id) } },
        });
        if (emailExists) throw new ConflictException('El email ya está en uso por otro usuario');
      }

      // Validar empresa-sede si se cambia alguno
      if (dto.id_empresa !== undefined || dto.id_ubigeo !== undefined) {
        const empresaId = dto.id_empresa ?? Number(existing.id_empresa);
        const sedeId = dto.id_ubigeo ?? existing.id_ubigeo;
        const sedeValida = await tx.distritos.findFirst({
          where: { id_ubigeo: sedeId },
        });
        if (!sedeValida) throw new BadRequestException('Distrito no encontrado');
      }

      // Actualizar datos básicos
      const updateData: any = {};
      if (dto.nombres !== undefined) updateData.nombres = dto.nombres;
      if (dto.apellidos !== undefined) updateData.apellidos = dto.apellidos;
      if (dto.email !== undefined) updateData.email = dto.email;
      if (dto.telefono !== undefined) updateData.telefono = dto.telefono;
      if (dto.id_empresa !== undefined) updateData.id_empresa = BigInt(dto.id_empresa);
      if (dto.id_ubigeo !== undefined) updateData.id_ubigeo = dto.id_ubigeo;
      if (dto.estado !== undefined) updateData.estado = dto.estado;

      if (Object.keys(updateData).length > 0) {
        await tx.usuarios.update({
          where: { id_usuario: BigInt(id) },
          data: updateData,
        });
      }

      // Sincronizar roles si vienen
      if (dto.roles !== undefined) {
        await this.syncRoles(tx, BigInt(id), dto.roles);
      }

      // ✅ Retornar usando tx
      return tx.usuarios.findUnique({
        where: { id_usuario: BigInt(id) },
        include: {
          empresas: true,
          distritos: true,
          usuarios_roles: {
            include: { roles_usuarios: true },
          },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.scoped.usuarios.findMany({
      include: {
        empresas: true,
        distritos: true,
        usuarios_roles: { include: { roles_usuarios: true } },
      },
      orderBy: { id_usuario: 'asc' },
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.scoped.usuarios.findUnique({
      where: { id_usuario: BigInt(id) },
      include: {
        empresas: true,
        distritos: true,
        usuarios_roles: {
          include: { roles_usuarios: true },
        },
      },
    });
    if (!usuario) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    try {
      if (updateUsuarioDto.id_empresa) {
        const empresa = await this.prisma.scoped.empresas.findUnique({
          where: { id_empresa: BigInt(updateUsuarioDto.id_empresa) },
        });
        if (!empresa) throw new NotFoundException('Empresa no encontrada');
      }
      if (updateUsuarioDto.id_ubigeo) {
        const sede = await this.prisma.scoped.distritos.findFirst({
          where: {
            id_ubigeo: updateUsuarioDto.id_ubigeo,
          },
        });
        if (!sede) throw new NotFoundException('Distrito no encontrado');
      }

      const updated = await this.prisma.scoped.usuarios.update({
        where: { id_usuario: BigInt(id) },
        data: {
          nombres: updateUsuarioDto.nombres,
          apellidos: updateUsuarioDto.apellidos,
          telefono: updateUsuarioDto.telefono,
          email: updateUsuarioDto.email,
          google_uid: updateUsuarioDto.google_uid,
          avatar_url: updateUsuarioDto.avatar_url,
          estado: updateUsuarioDto.estado,
          id_empresa: updateUsuarioDto.id_empresa ? BigInt(updateUsuarioDto.id_empresa) : undefined,
          id_ubigeo: updateUsuarioDto.id_ubigeo ? updateUsuarioDto.id_ubigeo : undefined,
        },
      });
      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
      throw error;
    }
  }

  async changeState(id: number, estado: boolean) {
    return this.update(id, { estado } as any);
  }

  async assignRole(usuarioId: number, rolId: number) {
    const usuario = await this.prisma.scoped.usuarios.findUnique({
      where: { id_usuario: BigInt(usuarioId) },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const rol = await this.prisma.scoped.roles_usuarios.findUnique({
      where: { id_rol_usuario: BigInt(rolId) },
    });
    if (!rol) throw new NotFoundException('Rol no encontrado');

    const existing = await this.prisma.scoped.usuarios_roles.findFirst({
      where: { id_usuario: BigInt(usuarioId), id_rol_usuario: BigInt(rolId) },
    });
    if (existing) throw new BadRequestException('El usuario ya tiene este rol');

    return this.prisma.scoped.usuarios_roles.create({
      data: {
        id_usuario: BigInt(usuarioId),
        id_rol_usuario: BigInt(rolId),
      },
    });
  }

  async removeRole(usuarioId: number, rolId: number) {
    return this.prisma.scoped.$transaction(async (tx) => {
      const relation = await tx.usuarios_roles.findFirst({
        where: { id_usuario: BigInt(usuarioId), id_rol_usuario: BigInt(rolId) },
      });
      if (!relation) throw new NotFoundException('Relación no encontrada');

      const count = await tx.usuarios_roles.count({
        where: { id_usuario: BigInt(usuarioId) },
      });
      if (count <= 1) {
        throw new BadRequestException('No se puede eliminar el único rol del usuario');
      }

      return tx.usuarios_roles.delete({
        where: { id_usuario_rol: relation.id_usuario_rol },
      });
    });
  }

  async getRolesByUser(usuarioId: number) {
    const usuario = await this.prisma.scoped.usuarios.findUnique({
      where: { id_usuario: BigInt(usuarioId) },
      include: { usuarios_roles: { include: { roles_usuarios: true } } },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario.usuarios_roles.map((ur) => ur.roles_usuarios);
  }

  private async syncRoles(tx: any, usuarioId: bigint, nuevosRolesIds: number[]) {
    for (const rolId of nuevosRolesIds) {
      const rol = await tx.roles_usuarios.findUnique({
        where: { id_rol_usuario: BigInt(rolId) },
      });
      if (!rol) throw new NotFoundException(`Rol con ID ${rolId} no existe`);
    }

    await tx.usuarios_roles.deleteMany({
      where: { id_usuario: usuarioId },
    });

    if (nuevosRolesIds.length === 0) {
      throw new BadRequestException('El usuario debe tener al menos un rol');
    }

    for (const rolId of nuevosRolesIds) {
      await tx.usuarios_roles.create({
        data: {
          id_usuario: usuarioId,
          id_rol_usuario: BigInt(rolId),
        },
      });
    }
  }
}