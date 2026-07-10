import { Module } from '@nestjs/common';
import { EvidenciasService } from './evidencias.service';
import { EvidenciasController } from './evidencias.controller';
import { R2Service } from '../../common/shared/r2.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [EvidenciasController],
  providers: [EvidenciasService, R2Service],
  exports: [EvidenciasService],
})
export class EvidenciasModule {}
