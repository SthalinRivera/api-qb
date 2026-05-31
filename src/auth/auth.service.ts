import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { PrismaService }
    from '../prisma/prisma.service';

import { Prisma }
    from '@prisma/client';

type UsuarioCompleto =
    Prisma.usuariosGetPayload<{
        include: {
            usuarios_roles: {
                include: {
                    roles_usuarios: true;
                };
            };
            sedes: true;
        };
    }>;

@Injectable()
export class AuthService {

    constructor(
        private prisma: PrismaService,
    ) { }

    async getProfile(authPayload: any) {
        try {

            const { user } = authPayload;
            if (!user) throw new UnauthorizedException('Usuario no encontrado');
            console.log('2️⃣ User extraído:', user.email);

            const email = user.email;
            const user_metadata = user.user_metadata;
            const sub = user.id;

            console.log('3️⃣ Buscando empresa default...');
            const defaultEmpresa = await this.prisma.empresas.findFirst({
                where: { estado: true },
                orderBy: { id_empresa: 'asc' },
            });
            if (!defaultEmpresa) throw new UnauthorizedException('No existe empresa configurada');
            console.log('4️⃣ Empresa encontrada:', defaultEmpresa.id_empresa);

            // ------------------------------
            //  Buscar rol por defecto
            // ------------------------------
            console.log('5️⃣ Buscando rol default...');
            const defaultRol = await this.prisma.roles_usuarios.findFirst({
                where: { estado: true },
                orderBy: { id_rol_usuario: 'asc' },
            });
            if (!defaultRol) {
                console.error('❌ No hay roles_usuarios con estado=true');
                throw new UnauthorizedException('Falta configuración inicial: rol');
            }
            console.log('6️⃣ Rol encontrado:', defaultRol.id_rol_usuario);

            // ------------------------------
            //  Buscar sede por defecto
            // ------------------------------
            console.log('7️⃣ Buscando sede default...');
            const defaultSede = await this.prisma.sedes.findFirst({
                where: {
                    estado: true,
                    id_empresa: defaultEmpresa.id_empresa,
                },
                orderBy: { id_sede: 'asc' },
            });
            if (!defaultSede) {
                console.error('❌ No hay sedes activas para la empresa', defaultEmpresa.id_empresa);
                throw new UnauthorizedException('Falta configuración inicial: sede');
            }
            console.log('8️⃣ Sede encontrada:', defaultSede.id_sede);
            //console.log('8️⃣ Sede encontrada:', defaultSede.id_sede);
            // ------------------------------
            //  Buscar o crear usuario
            // ------------------------------
            let userDb: UsuarioCompleto | null = await this.prisma.usuarios.findUnique({
                where: {
                    id_empresa_email: {
                        id_empresa: defaultEmpresa.id_empresa,
                        email,
                    },
                },
                include: {
                    usuarios_roles: { include: { roles_usuarios: true } },
                    sedes: true,
                },
            });

            if (!userDb) {
                console.log('9️⃣ Usuario no existe, creando...');
                // Validar que el google_uid no esté ya usado por otro usuario
                const existingGoogle = await this.prisma.usuarios.findUnique({
                    where: { google_uid: sub },
                });
                if (existingGoogle) {
                    throw new UnauthorizedException('Google UID ya registrado');
                }

                const fullName = user_metadata?.full_name || '';
                const [firstName, ...lastNameParts] = fullName.split(' ');
                const lastName = lastNameParts.join(' ');

                userDb = await this.prisma.usuarios.create({
                    data: {
                        id_empresa: defaultEmpresa.id_empresa,
                        email,
                        google_uid: sub,
                        nombres: firstName || '',
                        apellidos: lastName || '',
                        avatar_url: user_metadata?.avatar_url || null,
                        telefono: user_metadata?.phone || null,
                        estado_acceso: 'bloqueado',   // ✅ Cambiado de 'activo' a 'bloqueado'
                        estado: true,
                        id_sede: defaultSede.id_sede,
                        usuarios_roles: {
                            create: {
                                id_rol_usuario: defaultRol.id_rol_usuario,
                            },
                        },
                    },
                    include: {
                        usuarios_roles: { include: { roles_usuarios: true } },
                        sedes: true,
                    },
                });
                console.log('✅ Usuario creado, ID:', userDb.id_usuario);
            } else {
                console.log('🔟 Usuario existente, actualizando datos...');
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
                if (sub && userDb.google_uid !== sub) {
                    updateData.google_uid = sub;
                    hasChanges = true;
                }
                if (hasChanges) {
                    userDb = await this.prisma.usuarios.update({
                        where: { id_usuario: userDb.id_usuario },
                        data: updateData,
                        include: {
                            usuarios_roles: { include: { roles_usuarios: true } },
                            sedes: true,
                        },
                    });
                    console.log('✅ Usuario actualizado');
                }
            }

            // 🔐 Verificar si el usuario está bloqueado
            if (userDb.estado_acceso === 'bloqueado') {
                throw new UnauthorizedException(
                    'Acceso denegado. Por favor, contacta al administrador.'
                );
            }

            const rol = userDb.usuarios_roles?.[0]?.roles_usuarios;
            return {
                id: Number(userDb.id_usuario),
                id_empresa: Number(userDb.id_empresa),
                empresa: {
                    id: Number(defaultEmpresa.id_empresa),
                    razon_social: defaultEmpresa.razon_social,
                    nombre_comercial: defaultEmpresa.nombre_comercial,
                    ruc: defaultEmpresa.ruc,
                },
                email: userDb.email,
                google_uid: userDb.google_uid,
                nombres: userDb.nombres,
                apellidos: userDb.apellidos,
                telefono: userDb.telefono,
                avatar_url: userDb.avatar_url,
                estado_acceso: userDb.estado_acceso,
                estado: userDb.estado,
                created_at: userDb.created_at,
                rol: rol ? {
                    id: Number(rol.id_rol_usuario),
                    nombre: rol.nombre,
                    descripcion: rol.descripcion,
                } : null,
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