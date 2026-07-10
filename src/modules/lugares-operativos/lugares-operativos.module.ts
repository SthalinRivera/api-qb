import { Module } from '@nestjs/common';
import { LugaresOperativosService } from './lugares-operativos.service';
import { LugaresOperativosController } from './lugares-operativos.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LugaresOperativosController],
  providers: [LugaresOperativosService],
  exports: [LugaresOperativosService],
})
export class LugaresOperativosModule { }
