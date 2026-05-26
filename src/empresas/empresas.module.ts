// src/empresas/empresas.module.ts
import { Module } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { PrismaModule } from '../prisma/prisma.module'; // ajusta ruta

@Module({
  imports: [PrismaModule],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}