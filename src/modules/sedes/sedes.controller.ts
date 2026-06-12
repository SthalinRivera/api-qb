import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { SedesService } from './sedes.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@ApiTags('Sedes')
@Controller('sedes')
export class SedesController {
  constructor(private readonly sedesService: SedesService) { }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva sede' })
  create(@Body() createSedeDto: CreateSedeDto) {
    return this.sedesService.create(createSedeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las sedes (filtro opcional por tipo)' })
  findAll(@Query('tipo') tipo?: string) {
    return this.sedesService.findAll(tipo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una sede por ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sedesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar parcialmente una sede' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSedeDto: UpdateSedeDto) {
    return this.sedesService.update(id, updateSedeDto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar una sede' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateStateDto })
  changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto) {
    return this.sedesService.changeState(id, updateStateDto.estado);
  }
}