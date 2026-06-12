import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VariedadesService } from './variedades.service';
import { CreateVariedadDto } from './dto/create-variedade.dto';
import { UpdateVariedadDto } from './dto/update-variedade.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@ApiTags('Variedades')
@Controller('variedades')
export class VariedadesController {
  constructor(private readonly variedadesService: VariedadesService) { }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva variedad' })
  create(@Body() createVariedadDto: CreateVariedadDto) {
    return this.variedadesService.create(createVariedadDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las variedades (opcionalmente filtrar por estado)' })
  findAll(@Query('estado') estado?: string) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.variedadesService.findAll(estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una variedad por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.variedadesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una variedad' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateVariedadDto: UpdateVariedadDto) {
    return this.variedadesService.update(id, updateVariedadDto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar una variedad (soft delete)' })
  changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto) {
    return this.variedadesService.changeState(id, updateStateDto.estado);
  }

  // Endpoint especial: variedades de una fruta específica
  @Get('frutas/:frutaId/variedades')
  @ApiOperation({ summary: 'Listar variedades de una fruta (opcionalmente filtrar por estado)' })
  findByFruta(
    @Param('frutaId', ParseIntPipe) frutaId: number,
    @Query('estado') estado?: string,
  ) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.variedadesService.findByFruta(frutaId, estadoBool);
  }
}