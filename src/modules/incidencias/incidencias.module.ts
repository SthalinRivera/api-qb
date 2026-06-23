import { Module } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { IncidenciasController } from './incidencias.controller';
import { R2Service } from '../../common/shared/r2.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule, // ← Agregar ConfigModule para que ConfigService esté disponible
  ],
  controllers: [IncidenciasController],
  providers: [IncidenciasService, R2Service],
})
export class IncidenciasModule { }
