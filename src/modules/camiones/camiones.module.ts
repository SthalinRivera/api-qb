import { Module } from '@nestjs/common';
import { CamionesService } from './camiones.service';
import { CamionesController } from './camiones.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CamionesController],
  providers: [CamionesService],
  exports: [CamionesService],
})
export class CamionesModule { }
