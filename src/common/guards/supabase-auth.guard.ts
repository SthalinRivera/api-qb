import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly isAuthEnabled = process.env.ENABLE_AUTH === 'true';

  private readonly supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      realtime: {
        transport: WebSocket as any,
      },
    }
  );

  // ⚠️ Código de prueba temporal: dejar desactivado el token por ahora.
  // Cuando quieras volver a usar Supabase, cambia ENABLE_AUTH=true y reactivas
  // la validación original que está más abajo.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!this.isAuthEnabled) {
      request.user = request.user ?? { email: 'sthalin.11@gmail.com', role: 'administrador' };
      return true;
    }

    // Validación original de Supabase (mantener solo para pruebas / reactivación).
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token no proporcionado');
    }
    const token = authHeader.split(' ')[1];

    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Token inválido');
    }

    request.user = user;
    return true;
  }
}