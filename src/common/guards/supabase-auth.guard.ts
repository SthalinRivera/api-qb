import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  constructor(private prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }
    const token = authHeader.split(' ')[1];

    // 1. Validar token con Supabase
    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Token inválido');
    }

    // 2. Buscar o crear usuario en tabla local
    let dbUser = await this.prisma.usuarios.findFirst({
      where: {
        OR: [
          { google_uid: user.id },
          { email: user.email },
        ],
      },
    });

    if (!dbUser) {
      // Empresa por defecto (ajusta según tu lógica)
      const empresaPorDefecto = 1;
      const sedePorDefecto = 1;

      dbUser = await this.prisma.usuarios.create({
        data: {
          email: user.email!,
          nombres: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          google_uid: user.id,
          id_empresa: empresaPorDefecto,
          id_sede: sedePorDefecto,
          estado: true,
        },
      });
    }

    // 3. Asignar en request.user los datos de la tabla local
    request.user = {
      id_usuario: Number(dbUser.id_usuario),
      id_empresa: Number(dbUser.id_empresa),
      email: dbUser.email,
      nombres: dbUser.nombres,
    };

    return true;
  }
}