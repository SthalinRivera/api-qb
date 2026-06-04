import { Module } from '@nestjs/common';
import { LugarOperativoService } from './lugares-operativos.service';
import { LugarOperativoController } from './lugares-operativos.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LugarOperativoController],
  providers: [LugarOperativoService],
  exports: [LugarOperativoService],
})
export class LugarOperativoModule { }