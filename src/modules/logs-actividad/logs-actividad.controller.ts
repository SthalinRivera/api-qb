// src/modules/logs-actividad/logs-actividad.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { LogsActividadService } from './logs-actividad.service';
import { SupabaseAuthGuard } from 'src/common/guards/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('logs-actividad')
@UseGuards(SupabaseAuthGuard)
export class LogsActividadController {
  constructor(
    private readonly logsActividadService: LogsActividadService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('tabla') tabla?: string,
    @Query('id_usuario') id_usuario?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const profile = await this.authService.getProfile({ user: req.user });
    return this.logsActividadService.findAll(profile.id_empresa, {
      tabla,
      id_usuario: id_usuario ? parseInt(id_usuario) : undefined,
      fechaDesde,
      fechaHasta,
    });
  }

  @Get('tables')
  getTables() {
    return this.logsActividadService.getTables();
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    const profile = await this.authService.getProfile({ user: req.user });
    return this.logsActividadService.getStats(profile.id_empresa);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.logsActividadService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    id_empresa?: number;
    id_usuario?: number;
    accion: string;
    tabla_afectada?: string;
    id_registro?: number;
    datos_anteriores?: any;
    datos_nuevos?: any;
  }) {
    return this.logsActividadService.create(body);
  }
}
