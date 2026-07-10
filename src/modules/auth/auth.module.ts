import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AuthController],
    providers: [AuthService, SupabaseAuthGuard],
    exports: [SupabaseAuthGuard, AuthService],
})
export class AuthModule { }