import { Module } from '@nestjs/common';
import { CalidadesService } from './calidades.service';
import { CalidadesController } from './calidades.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CalidadesController],
  providers: [CalidadesService],
  exports: [CalidadesService],
})
export class CalidadesModule {}