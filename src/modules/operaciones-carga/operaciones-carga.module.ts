import { Module } from '@nestjs/common';
import { OperacionesCargaService } from './operaciones-carga.service';
import { OperacionesCargaController } from './operaciones-carga.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { DetalleCargaModule } from '../detalle-carga/detalle-carga.module';
import { DetalleCargaService } from '../detalle-carga/detalle-carga.service';
import { GuiasOperativasModule } from '../guias-operativas/guias-operativas.module'; // 👈 Importa

import { CreateDetalleCargaForOperacionDto } from '../detalle-carga/dto/create-detalle-carga-for-operacion.dto';
import { ItemsRepartoModule } from '../items-reparto/items-reparto.module';
@Module({
  imports: [PrismaModule, DetalleCargaModule, ItemsRepartoModule, GuiasOperativasModule],
  controllers: [OperacionesCargaController],
  providers: [OperacionesCargaService],

})
export class OperacionesCargaModule { }