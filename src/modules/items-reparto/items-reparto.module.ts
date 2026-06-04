import { Module } from '@nestjs/common';
import { ItemsRepartoService } from './items-reparto.service';
import { ItemsRepartoController } from './items-reparto.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ItemsRepartoController],
  providers: [ItemsRepartoService],
  exports: [ItemsRepartoService],
})
export class ItemsRepartoModule { }
