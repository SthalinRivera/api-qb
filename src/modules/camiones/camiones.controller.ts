import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CamionesService } from './camiones.service';
import { CreateCamionDto } from './dto/create-camione.dto';
import { UpdateCamionDto } from './dto/update-camione.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('Camiones')
@Controller('camiones')
@UseGuards(SupabaseAuthGuard)
export class CamionesController {
  constructor(
    private readonly camionesService: CamionesService,
    private readonly authService: AuthService,
  ) { }

  private async getProfile(req: any) {
    return this.authService.getProfile({ user: req.user });
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo camión' })
  async create(@Body() createCamionDto: CreateCamionDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.camionesService.create({
      ...createCamionDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar camiones de la empresa' })
  async findAll(@Query('estado') estado?: string, @Req() req?: any) {
    const profile = await this.getProfile(req);
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.camionesService.findAll(profile.id_empresa, estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un camión por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.camionesService.findOne(id, profile.id_empresa);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un camión' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateCamionDto: UpdateCamionDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.camionesService.update(id, {
      ...updateCamionDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar un camión (soft delete)' })
  async changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.camionesService.changeState(id, updateStateDto.estado, profile.id_empresa);
  }
}
