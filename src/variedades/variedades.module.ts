import { Module } from '@nestjs/common';
import { VariedadesService } from './variedades.service';
import { VariedadesController } from './variedades.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VariedadesController],
  providers: [VariedadesService],
  exports: [VariedadesService],
})
export class VariedadesModule {}