import { Module } from '@nestjs/common';
import { CamionesService } from './camiones.service';
import { CamionesController } from './camiones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CamionesController],
  providers: [CamionesService],
  exports: [CamionesService],
})
export class CamionesModule {}