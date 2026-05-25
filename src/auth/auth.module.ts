import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './supabase-auth/supabase-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AuthController],
    providers: [AuthService, SupabaseAuthGuard],
    exports: [SupabaseAuthGuard],
})
export class AuthModule { }