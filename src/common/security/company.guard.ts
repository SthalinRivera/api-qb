import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SupabaseAuthGuard } from '../guards/supabase-auth.guard';

@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly auth: SupabaseAuthGuard) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    // No ENABLE_AUTH bypass. Identity is always checked against Supabase.
    await this.auth.canActivate(context);
    if (!req.user.email) throw new ForbiddenException('El perfil autenticado requiere email.');
    const users = await this.prisma.usuarios.findMany({
      where: { estado: true, OR: [{ google_uid: req.user.id }, { google_uid: null, email: req.user.email }] },
      include: { usuarios_roles: { include: { roles_usuarios: { include: { roles_modulos: { include: { modulos: true } } } } } } },
    });
    if (users.length !== 1) throw new ForbiddenException('Perfil inexistente o ambiguo. Contacta al administrador.');
    const user = users[0];
    const memberships = user.usuarios_roles.filter((r) => r.roles_usuarios.estado !== false);
    const roles = memberships.map((r) => r.roles_usuarios.nombre.toLowerCase());
    const administrador = roles.some((r) => ['admin','administrador','superadmin','super_admin'].includes(r));
    const repartidor = roles.includes('repartidor') && !administrador && !roles.some((r) => ['encargado_carga','supervisor','gerente'].includes(r));
    req.actor = { empresaId: user.id_empresa, usuarioId: user.id_usuario, roles, repartidor, administrador };
    const root = req.path.split('/').filter(Boolean)[0] || '';
    if (root === 'auth') return true;
    const rutas = memberships.flatMap((r) => r.roles_usuarios.roles_modulos.filter((m) => m.modulos.estado !== false).map((m) => m.modulos.ruta.replace(/^\/?dashboard\//, '').replace(/^\//, '').split('/')[0]).map(r => r === 'sedes' ? 'ubicaciones' : r));
    const module = root === 'detalle-carga' ? 'operaciones-carga' : root === 'ubigeo' ? 'ubicaciones' : root;
    const catalogos = ['clientes','puestos','ubicaciones','camiones','usuarios','frutas','variedades','calidades','tipos-jaba','lugares-operativos','ubigeo'];
    const operacional = rutas.some((r) => ['operaciones-carga','items-reparto','entregas','guias-operativas'].includes(r));
    if (!administrador && !rutas.includes(module) && !(req.method === 'GET' && operacional && catalogos.includes(root)))
      throw new ForbiddenException('No tienes permiso para este módulo.');
    if (repartidor && req.method !== 'GET' && root !== 'entregas' && !(root === 'operaciones-carga' && req.path.endsWith('/estado') && req.body?.estado === 'repartiendo'))
      throw new ForbiddenException('El repartidor solo puede iniciar y registrar sus entregas.');
    return true;
  }
}
