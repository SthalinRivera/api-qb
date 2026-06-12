import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PuestosService } from './puestos.service';
import { CreatePuestoDto } from './dto/create-puesto.dto';
import { UpdatePuestoDto } from './dto/update-puesto.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@ApiTags('Puestos')
@Controller('puestos')
export class PuestosController {
  constructor(private readonly puestosService: PuestosService) { }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo puesto' })
  create(@Body() createPuestoDto: CreatePuestoDto) {
    return this.puestosService.create(createPuestoDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar puestos (opcionalmente filtrar por estado)' })
  findAll(@Query('estado') estado?: string) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.puestosService.findAll(estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un puesto por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.puestosService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un puesto' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePuestoDto: UpdatePuestoDto) {
    return this.puestosService.update(id, updatePuestoDto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar un puesto (soft delete)' })
  changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto) {
    return this.puestosService.changeState(id, updateStateDto.estado);
  }
}