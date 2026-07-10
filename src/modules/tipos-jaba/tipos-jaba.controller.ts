import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TiposJabaService } from './tipos-jaba.service';
import { CreateTipoJabaDto } from './dto/create-tipos-jaba.dto';
import { UpdateTipoJabaDto } from './dto/update-tipos-jaba.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('Tipos de Jaba')
@Controller('tipos-jaba')
@UseGuards(SupabaseAuthGuard)
export class TiposJabaController {
  constructor(
    private readonly tiposJabaService: TiposJabaService,
    private readonly authService: AuthService,
  ) { }

  private async getProfile(req: any) {
    return this.authService.getProfile({ user: req.user });
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo tipo de jaba' })
  async create(@Body() createTipoJabaDto: CreateTipoJabaDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.tiposJabaService.create({
      ...createTipoJabaDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar tipos de jaba de la empresa' })
  async findAll(@Query('estado') estado?: string, @Req() req?: any) {
    const profile = await this.getProfile(req);
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.tiposJabaService.findAll(profile.id_empresa, estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de jaba por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.tiposJabaService.findOne(id, profile.id_empresa);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un tipo de jaba' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateTipoJabaDto: UpdateTipoJabaDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.tiposJabaService.update(id, {
      ...updateTipoJabaDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar un tipo de jaba (soft delete)' })
  async changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.tiposJabaService.changeState(id, updateStateDto.estado, profile.id_empresa);
  }
}
