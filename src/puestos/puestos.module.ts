import { Module } from '@nestjs/common';
import { PuestosService } from './puestos.service';
import { PuestosController } from './puestos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PuestosController],
  providers: [PuestosService],
  exports: [PuestosService],
})
export class PuestosModule {}