import { Module } from '@nestjs/common';
import { LugaresOperativosService } from './lugares-operativos.service';
import { LugaresOperativosController } from './lugares-operativos.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LugaresOperativosController],
  providers: [LugaresOperativosService],
  exports: [LugaresOperativosService],
})
export class LugaresOperativosModule { }