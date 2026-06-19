import { Module } from '@nestjs/common';
import { ItemsRepartoController } from './items-reparto.controller';
import { ItemsRepartoService } from './items-reparto.service';
import { PrismaService } from '../../config/prisma/prisma.service';

@Module({
  controllers: [ItemsRepartoController],
  providers: [ItemsRepartoService, PrismaService],
  exports: [ItemsRepartoService],
})
export class ItemsRepartoModule { }