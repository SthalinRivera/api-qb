import { Module } from '@nestjs/common';
import { OperacionesCargaService } from './operaciones-carga.service';
import { OperacionesCargaController } from './operaciones-carga.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { DetalleCargaModule } from '../detalle-carga/detalle-carga.module';
import { DetalleCargaService } from '../detalle-carga/detalle-carga.service';
import { CreateDetalleCargaForOperacionDto } from '../detalle-carga/dto/create-detalle-carga-for-operacion.dto';
import { ItemsRepartoModule } from '../items-reparto/items-reparto.module';
@Module({
  imports: [PrismaModule, DetalleCargaModule, ItemsRepartoModule],
  controllers: [OperacionesCargaController],
  providers: [OperacionesCargaService],

})
export class OperacionesCargaModule { }