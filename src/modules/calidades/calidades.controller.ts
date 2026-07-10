import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CalidadesService } from './calidades.service';
import { CreateCalidadDto } from './dto/create-calidade.dto';
import { UpdateCalidadDto } from './dto/update-calidade.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('Calidades')
@Controller('calidades')
@UseGuards(SupabaseAuthGuard)
export class CalidadesController {
  constructor(
    private readonly calidadesService: CalidadesService,
    private readonly authService: AuthService,
  ) { }

  private async getProfile(req: any) {
    return this.authService.getProfile({ user: req.user });
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva calidad' })
  async create(@Body() createCalidadDto: CreateCalidadDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.calidadesService.create({
      ...createCalidadDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar calidades de la empresa del usuario' })
  async findAll(@Query('estado') estado?: string, @Req() req?: any) {
    const profile = await this.getProfile(req);
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.calidadesService.findAll(profile.id_empresa, estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una calidad por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.calidadesService.findOne(id, profile.id_empresa);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una calidad' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateCalidadDto: UpdateCalidadDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.calidadesService.update(id, {
      ...updateCalidadDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar una calidad (soft delete)' })
  async changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.calidadesService.changeState(id, updateStateDto.estado, profile.id_empresa);
  }
}
