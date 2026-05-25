import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from './auth/supabase-auth/supabase-auth.guard';
import { CurrentUser } from './auth/current-user/current-user.decorator';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Hello World!';
  }

  @Get('profile')
  @UseGuards(SupabaseAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return {
      message: 'Usuario autenticado',
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
    };
  }
}