import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AssignModulosDto } from './dto/roles-modulo.dto';

@Injectable()
export class RolesModulosService {
    constructor(private readonly prisma: PrismaService) {}

    async assignModulos(dto: AssignModulosDto) {
        const rolId = BigInt(dto.rol_id);
        const moduloIds = dto.modulo_ids.map((id) => BigInt(id));
        const usuarioAsigno = dto.usuario_asigno ? BigInt(dto.usuario_asigno) : null;

        return this.prisma.scoped.$transaction(async (tx) => {
            // Verificar que el rol existe
            const rol = await tx.roles_usuarios.findUnique({
                where: { id_rol_usuario: rolId },
            });
            if (!rol) throw new NotFoundException(`Rol con ID ${dto.rol_id} no encontrado`);

            // Eliminar asignaciones actuales del rol
            await tx.roles_modulos.deleteMany({
                where: { rol_id: rolId },
            });

            // Crear nuevas asignaciones
            if (moduloIds.length === 0) {
                return { message: 'Módulos desasignados correctamente', count: 0 };
            }

            const data = moduloIds.map((moduloId) => ({
                rol_id: rolId,
                modulo_id: moduloId,
                usuario_asigno: usuarioAsigno,
            }));

            const result = await tx.roles_modulos.createMany({
                data,
                skipDuplicates: true,
            });

            return { message: 'Módulos asignados correctamente', count: result.count };
        });
    }

    async toggleModulo(rolId: number, moduloId: number, usuarioAsigno?: number) {
        const rolIdBig = BigInt(rolId);
        const moduloIdBig = BigInt(moduloId);

        // Verificar que el rol existe
        const rol = await this.prisma.scoped.roles_usuarios.findUnique({
            where: { id_rol_usuario: rolIdBig },
        });
        if (!rol) throw new NotFoundException(`Rol con ID ${rolId} no encontrado`);

        // Verificar que el módulo existe
        const modulo = await this.prisma.scoped.modulos.findUnique({
            where: { id_modulo: moduloIdBig },
        });
        if (!modulo) throw new NotFoundException(`Módulo con ID ${moduloId} no encontrado`);

        // Verificar si ya existe la asignación
        const existing = await this.prisma.scoped.roles_modulos.findFirst({
            where: {
                rol_id: rolIdBig,
                modulo_id: moduloIdBig,
            },
        });

        if (existing) {
            // Quitar módulo del rol
            await this.prisma.scoped.roles_modulos.delete({
                where: { id_rol_modulo: existing.id_rol_modulo },
            });
            return { assigned: false, message: 'Módulo removido del rol' };
        } else {
            // Asignar módulo al rol
            await this.prisma.scoped.roles_modulos.create({
                data: {
                    rol_id: rolIdBig,
                    modulo_id: moduloIdBig,
                    usuario_asigno: usuarioAsigno ? BigInt(usuarioAsigno) : null,
                },
            });
            return { assigned: true, message: 'Módulo asignado al rol' };
        }
    }

    async getModulosByRol(rolId: number) {
        const rol = await this.prisma.scoped.roles_usuarios.findUnique({
            where: { id_rol_usuario: BigInt(rolId) },
        });
        if (!rol) throw new NotFoundException(`Rol con ID ${rolId} no encontrado`);

        const asignaciones = await this.prisma.scoped.roles_modulos.findMany({
            where: { rol_id: BigInt(rolId) },
            include: {
                modulos: {
                    include: { categorias: true },
                },
            },
            orderBy: { fecha_asignacion: 'desc' },
        });

        return asignaciones.map((a) => ({
            id_rol_modulo: Number(a.id_rol_modulo),
            modulo: {
                id_modulo: Number(a.modulos.id_modulo),
                nombre: a.modulos.nombre,
                ruta: a.modulos.ruta,
                orden: a.modulos.orden,
                estado: a.modulos.estado,
                categoria: {
                    id_categoria: Number(a.modulos.categorias.id_categoria),
                    nombre: a.modulos.categorias.nombre,
                },
            },
            fecha_asignacion: a.fecha_asignacion,
        }));
    }

    async getRolesByModulo(moduloId: number) {
        const modulo = await this.prisma.scoped.modulos.findUnique({
            where: { id_modulo: BigInt(moduloId) },
        });
        if (!modulo) throw new NotFoundException(`Módulo con ID ${moduloId} no encontrado`);

        const asignaciones = await this.prisma.scoped.roles_modulos.findMany({
            where: { modulo_id: BigInt(moduloId) },
            include: {
                roles_usuarios: true,
            },
        });

        return asignaciones.map((a) => ({
            id_rol_modulo: Number(a.id_rol_modulo),
            rol: {
                id_rol_usuario: Number(a.roles_usuarios.id_rol_usuario),
                nombre: a.roles_usuarios.nombre,
                descripcion: a.roles_usuarios.descripcion,
            },
            fecha_asignacion: a.fecha_asignacion,
        }));
    }

    async getModulosPermitidosByUsuario(usuarioId: number) {
        // Obtener los roles del usuario
        const usuarioRoles = await this.prisma.scoped.usuarios_roles.findMany({
            where: { id_usuario: BigInt(usuarioId) },
            include: { roles_usuarios: true },
        });

        const rolIds = usuarioRoles.map((ur) => ur.id_rol_usuario);

        if (rolIds.length === 0) return [];

        // Obtener todos los módulos asignados a esos roles (sin duplicados)
        const modulosAsignados = await this.prisma.scoped.roles_modulos.findMany({
            where: { rol_id: { in: rolIds } },
            include: {
                modulos: {
                    include: { categorias: true },
                },
            },
        });

        // Deduplicar por id_modulo
        const modulosMap = new Map();
        for (const asignacion of modulosAsignados) {
            const modulo = asignacion.modulos;
            if (!modulosMap.has(Number(modulo.id_modulo))) {
                modulosMap.set(Number(modulo.id_modulo), {
                    id_modulo: Number(modulo.id_modulo),
                    nombre: modulo.nombre,
                    ruta: modulo.ruta,
                    orden: modulo.orden,
                    estado: modulo.estado,
                    categoria: {
                        id_categoria: Number(modulo.categorias.id_categoria),
                        nombre: modulo.categorias.nombre,
                        icono_web: modulo.categorias.icono_web,
                        icono_mobil: modulo.categorias.icono_mobil,
                        orden: modulo.categorias.orden,
                    },
                });
            }
        }

        return Array.from(modulosMap.values());
    }
}
