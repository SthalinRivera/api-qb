import { Controller, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Get('check')
    check() { return { authorized: true }; }

    @Get('session')
    getSession(@Req() req: any) { return this.authService.getProfile({ user: req.user }, true); }

    @Get('profile')
    async getProfile(@Req() req: any) {
        return this.authService.getProfile({ user: req.user });
    }
}