import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      realtime: {
        transport: WebSocket as any,
      },
    }
  );

  // ⚠️ ELIMINA el constructor con PrismaService, ya no lo necesitas
  // constructor(private prisma: PrismaService) { }

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

    // ✅ Solo asigna el usuario de Supabase al request, sin tocar la BD
    request.user = user; // objeto completo de Supabase

    return true;
  }
}