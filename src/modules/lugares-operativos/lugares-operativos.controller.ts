import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LugaresOperativosService } from './lugares-operativos.service';
import { CreateLugarOperativoDto } from './dto/create-lugar-operativo.dto';
import { UpdateLugarOperativoDto } from './dto/update-lugar-operativo.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@ApiTags('Lugares Operativos')
@Controller('lugares-operativos')
export class LugaresOperativosController {
  constructor(private readonly lugaresOperativosService: LugaresOperativosService) { }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo lugar operativo (mercado, almacén, etc.)' })
  create(@Body() createLugarOperativoDto: CreateLugarOperativoDto) {
    return this.lugaresOperativosService.create(createLugarOperativoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar lugares operativos (opcionalmente filtrar por estado)' })
  findAll(@Query('estado') estado?: string) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.lugaresOperativosService.findAll(estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un lugar operativo por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lugaresOperativosService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un lugar operativo' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLugarOperativoDto: UpdateLugarOperativoDto) {
    return this.lugaresOperativosService.update(id, updateLugarOperativoDto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar un lugar operativo (soft delete)' })
  changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto) {
    return this.lugaresOperativosService.changeState(id, updateStateDto.estado);
  }

  // Endpoint especial: lugares por sede
  @Get('sedes/:sedeId/lugares')
  @ApiOperation({ summary: 'Listar lugares operativos de una sede (opcionalmente filtrar por estado)' })
  findBySede(
    @Param('sedeId', ParseIntPipe) sedeId: number,
    @Query('estado') estado?: string,
  ) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.lugaresOperativosService.findBySede(sedeId, estadoBool);
  }
}