import { Module } from '@nestjs/common';
import { LogsActividadService } from './logs-actividad.service';
import { LogsActividadController } from './logs-actividad.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LogsActividadController],
  providers: [LogsActividadService],
  exports: [LogsActividadService],
})
export class LogsActividadModule {}
