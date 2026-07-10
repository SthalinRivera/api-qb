import { Module } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { IncidenciasController } from './incidencias.controller';
import { R2Service } from '../../common/shared/r2.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule, AuthModule 
  ],
  controllers: [IncidenciasController],
  providers: [IncidenciasService, R2Service],
})
export class IncidenciasModule { }
