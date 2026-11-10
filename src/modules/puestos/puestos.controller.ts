import { QueryPuestosDto } from './dto/query-puestos.dto';
import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PuestosService } from './puestos.service';
import { CreatePuestoDto } from './dto/create-puesto.dto';
import { UpdatePuestoDto } from './dto/update-puesto.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('Puestos')
@Controller('puestos')
@UseGuards(SupabaseAuthGuard)
export class PuestosController {
  constructor(
    private readonly puestosService: PuestosService,
    private readonly authService: AuthService,
  ) { }

  private async getProfile(req: any) {
    return this.authService.getProfile({ user: req.user });
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo puesto' })
  async create(@Body() createPuestoDto: CreatePuestoDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.puestosService.create({
      ...createPuestoDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar puestos de la empresa' })
  async findAll(@Query() query: QueryPuestosDto, @Req() req: any) {
    return this.puestosService.findAll(Number(req.actor.empresaId), query.estado === 'true' ? true : query.estado === 'false' ? false : undefined, query.id_lugar, query);
  }

  @Get('mercado/:idMercado')
  @ApiOperation({ summary: 'Puestos de un mercado específico' })
  async findByMercado(
    @Param('idMercado', ParseIntPipe) idMercado: number,
    @Query('estado') estado?: string,
  ) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.puestosService.findByMercado(idMercado, estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un puesto por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.puestosService.findOne(id, profile.id_empresa);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un puesto' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updatePuestoDto: UpdatePuestoDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.puestosService.update(id, {
      ...updatePuestoDto,
      id_empresa: profile.id_empresa,
    });
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar un puesto (soft delete)' })
  async changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    return this.puestosService.changeState(id, updateStateDto.estado, profile.id_empresa);
  }
}
