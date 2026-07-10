import { Module } from '@nestjs/common';
import { CalidadesService } from './calidades.service';
import { CalidadesController } from './calidades.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CalidadesController],
  providers: [CalidadesService],
  exports: [CalidadesService],
})
export class CalidadesModule { }
