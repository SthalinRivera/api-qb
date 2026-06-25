import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../../config/prisma/prisma.service';
import WebSocket from 'ws'; // 👈 importa ws

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      // 👇 opción de transporte usando ws
      realtime: {
        transport: WebSocket as any, // 👈 casteo para evitar el error de tipos
      },
    }
  );

  constructor(private prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }
    const token = authHeader.split(' ')[1];

    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Token inválido');
    }

    let dbUser = await this.prisma.usuarios.findFirst({
      where: {
        OR: [
          { google_uid: user.id },
          { email: user.email },
        ],
      },
    });

    if (!dbUser) {
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

    request.user = {
      id_usuario: Number(dbUser.id_usuario),
      id_empresa: Number(dbUser.id_empresa),
      email: dbUser.email,
      nombres: dbUser.nombres,
    };

    return true;
  }
}