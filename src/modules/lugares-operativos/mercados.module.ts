import { Module } from '@nestjs/common';
import { MercadosService } from './mercados.service';
import { MercadosController } from './mercados.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MercadosController],
  providers: [MercadosService],
  exports: [MercadosService],
})
export class MercadosModule { }