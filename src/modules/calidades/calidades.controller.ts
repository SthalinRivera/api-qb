import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CalidadesService } from './calidades.service';
import { CreateCalidadDto } from './dto/create-calidade.dto';
import { UpdateCalidadDto } from './dto/update-calidade.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@ApiTags('Calidades')
@Controller('calidades')
export class CalidadesController {
  constructor(private readonly calidadesService: CalidadesService) { }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva calidad' })
  create(@Body() createCalidadDto: CreateCalidadDto) {
    return this.calidadesService.create(createCalidadDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar calidades (opcionalmente filtrar por estado)' })
  findAll(@Query('estado') estado?: string) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.calidadesService.findAll(estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una calidad por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.calidadesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una calidad' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCalidadDto: UpdateCalidadDto) {
    return this.calidadesService.update(id, updateCalidadDto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar una calidad (soft delete)' })
  changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto) {
    return this.calidadesService.changeState(id, updateStateDto.estado);
  }
}