import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../../config/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {

    constructor(
        private prisma: PrismaService,
    ) { }

    async getProfile(authPayload: any) {
        try {
            const { user } = authPayload;

            if (!user) {
                throw new UnauthorizedException('Usuario no encontrado');
            }

            const email = user.email;
            const user_metadata = user.user_metadata;
            const sub = user.id;

            if (!email) {
                throw new UnauthorizedException('El token no contiene email');
            }

            console.log('1️⃣ Usuario extraído desde token:', email);

            let userDb: any = await this.prisma.scoped.usuarios.findFirst({
                where: {
                    email,
                    estado: true,
                },
                include: {
                    empresas: true,
                    usuarios_roles: {
                        include: {
                            roles_usuarios: true,
                        },
                    },
                    sedes: true,
                },
            });

            if (!userDb) {
                console.warn('❌ Usuario no registrado en la base de datos:', email);
                throw new UnauthorizedException(
                    'Usuario no registrado en el sistema. Contacta al administrador.'
                );
            }

            console.log('2️⃣ Usuario encontrado en BD:', userDb.id_usuario);

            const updateData: any = {};
            let hasChanges = false;

            if (user_metadata?.full_name) {
                const fullName = user_metadata.full_name;
                const [firstName, ...lastNameParts] = fullName.split(' ');
                const lastName = lastNameParts.join(' ');

                if (userDb.nombres !== firstName) {
                    updateData.nombres = firstName;
                    hasChanges = true;
                }

                if (userDb.apellidos !== lastName) {
                    updateData.apellidos = lastName;
                    hasChanges = true;
                }
            }

            if (user_metadata?.avatar_url && userDb.avatar_url !== user_metadata.avatar_url) {
                updateData.avatar_url = user_metadata.avatar_url;
                hasChanges = true;
            }

            if (user_metadata?.phone && userDb.telefono !== user_metadata.phone) {
                updateData.telefono = user_metadata.phone;
                hasChanges = true;
            }

            if (sub && userDb.google_uid !== sub) {
                updateData.google_uid = sub;
                hasChanges = true;
            }

            if (hasChanges) {
                userDb = await this.prisma.scoped.usuarios.update({
                    where: {
                        id_usuario: userDb.id_usuario,
                    },
                    data: updateData,
                    include: {
                        empresas: true,
                        usuarios_roles: {
                            include: {
                                roles_usuarios: true,
                            },
                        },
                        sedes: true,
                    },
                });

                console.log('✅ Usuario actualizado desde Google');
            }

            if (!userDb.estado) {
                throw new UnauthorizedException(
                    'Usuario inactivo. Contacta al administrador.'
                );
            }

            const roles = userDb.usuarios_roles.map((ur: any) => ({
                id: Number(ur.roles_usuarios.id_rol_usuario),
                nombre: ur.roles_usuarios.nombre,
                descripcion: ur.roles_usuarios.descripcion,
            }));

            // Obtener los IDs de los roles del usuario
            const rolIds = userDb.usuarios_roles.map((ur: any) => ur.roles_usuarios.id_rol_usuario);

            // Obtener módulos asignados a esos roles (query separado)
            let modulos: any[] = [];
            if (rolIds.length > 0) {
                const rolIdsBigInt = rolIds.map((id: any) => BigInt(id));
                const modulosAsignados = await this.prisma.scoped.$queryRaw(Prisma.sql`
                    SELECT DISTINCT
                        m.id_modulo,
                        m.nombre,
                        m.ruta,
                        m.orden,
                        m.estado,
                        c.id_categoria,
                        c.nombre as cat_nombre,
                        c.icono_web,
                        c.icono_mobil,
                        c.orden as cat_orden
                    FROM roles_modulos rm
                    INNER JOIN modulos m ON m.id_modulo = rm.modulo_id
                    INNER JOIN categorias c ON c.id_categoria = m.id_categoria
                    WHERE rm.rol_id IN (${Prisma.join(rolIdsBigInt)})
                    AND m.estado = true
                    ORDER BY c.orden ASC, m.orden ASC
                `);

                modulos = (modulosAsignados as any[]).map((m: any) => ({
                    id_modulo: Number(m.id_modulo),
                    nombre: m.nombre,
                    ruta: m.ruta.startsWith('/') ? `/dashboard${m.ruta}` : `/dashboard/${m.ruta}`,
                    orden: Number(m.orden),
                    estado: m.estado,
                    categoria: {
                        id_categoria: Number(m.id_categoria),
                        nombre: m.cat_nombre,
                        icono_web: m.icono_web,
                        icono_mobil: m.icono_mobil,
                        orden: Number(m.cat_orden),
                    },
                }));
            }

            return {
                id: Number(userDb.id_usuario),
                id_empresa: Number(userDb.id_empresa),

                empresa: userDb.empresas ? {
                    id: Number(userDb.empresas.id_empresa),
                    razon_social: userDb.empresas.razon_social,
                    nombre_comercial: userDb.empresas.nombre_comercial,
                    ruc: userDb.empresas.ruc,
                } : null,

                email: userDb.email,
                google_uid: userDb.google_uid,
                nombres: userDb.nombres,
                apellidos: userDb.apellidos,
                telefono: userDb.telefono,
                avatar_url: userDb.avatar_url,
                estado: userDb.estado,
                created_at: userDb.created_at,

                roles,
                modulos,

                sede: userDb.sedes ? {
                    id: Number(userDb.sedes.id_sede),
                    nombre: userDb.sedes.nombre,
                    tipo_sede: userDb.sedes.tipo_sede,
                    ciudad: userDb.sedes.ciudad,
                    departamento: userDb.sedes.departamento,
                } : null,
            };

        } catch (error) {
            console.error('❌ Error en getProfile:', error);
            throw error;
        }
    }
}
