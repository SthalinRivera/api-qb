import { UbigeoPipe } from '../../common/pipes/ubigeo.pipe';
import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LugaresOperativosService } from './lugares-operativos.service';
import { CreateLugarOperativoDto } from './dto/create-lugar-operativo.dto';
import { UpdateLugarOperativoDto } from './dto/update-lugar-operativo.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('Lugares Operativos')
@Controller('lugares-operativos')
@UseGuards(SupabaseAuthGuard)
export class LugaresOperativosController {
  constructor(
    private readonly lugaresOperativosService: LugaresOperativosService,
    private readonly authService: AuthService,
  ) { }

  private async getProfile(req: any) {
    return this.authService.getProfile({ user: req.user });
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo lugar operativo (mercado, almacén, etc.)' })
  async create(@Body() createLugarOperativoDto: CreateLugarOperativoDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.lugaresOperativosService.create({
      ...createLugarOperativoDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar lugares operativos de la empresa' })
  async findAll(@Query('estado') estado?: string, @Req() req?: any) {
    const profile = await this.getProfile(req);
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.lugaresOperativosService.findAll(profile.id_empresa, estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un lugar operativo por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.lugaresOperativosService.findOne(id, profile.id_empresa);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un lugar operativo' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateLugarOperativoDto: UpdateLugarOperativoDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.lugaresOperativosService.update(id, {
      ...updateLugarOperativoDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar un lugar operativo (soft delete)' })
  async changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.lugaresOperativosService.changeState(id, updateStateDto.estado, profile.id_empresa);
  }

  @Get('ubicaciones/:ubigeo/lugares')
  @ApiOperation({ summary: 'Listar lugares operativos de una ubicación' })
  async findByUbicacion(
    @Param('ubigeo', UbigeoPipe) ubigeo: string,
    @Query('estado') estado?: string,
  ) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.lugaresOperativosService.findByUbicacion(ubigeo, estadoBool);
  }
}
