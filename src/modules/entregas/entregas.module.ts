import { Module } from '@nestjs/common';
import { EntregasService } from './entregas.service';
import { EntregasController } from './entregas.controller';
import { PrismaModule } from 'src/config/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [EntregasController],
  providers: [EntregasService],
})
export class EntregasModule { }
