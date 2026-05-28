import { Module } from '@nestjs/common';
import { PuestoSeccionesService } from './puesto-secciones.service';
import { PuestoSeccionesController } from './puesto-secciones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PuestoSeccionesController],
  providers: [PuestoSeccionesService],
  exports: [PuestoSeccionesService],
})
export class PuestoSeccionesModule {}