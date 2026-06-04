import { Module } from '@nestjs/common';
import { DetalleCargaService } from './detalle-carga.service';
import { DetalleCargaController } from './detalle-carga.controller';
import { ItemsRepartoModule } from '../items-reparto/items-reparto.module'; // 👈 Importar
import { PrismaModule } from 'src/config/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ItemsRepartoModule],
  controllers: [DetalleCargaController,],
  providers: [DetalleCargaService],
  exports: [DetalleCargaService],
})
export class DetalleCargaModule { }
