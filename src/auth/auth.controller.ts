import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth/supabase-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Get('profile')
    @UseGuards(SupabaseAuthGuard)  // 👈 activa el guard
    async getProfile(@Req() req: any) {
        return this.authService.getProfile({ user: req.user });
    }
}