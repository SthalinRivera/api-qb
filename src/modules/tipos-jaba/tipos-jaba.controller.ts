import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TiposJabaService } from './tipos-jaba.service';
import { CreateTipoJabaDto } from './dto/create-tipos-jaba.dto';
import { UpdateTipoJabaDto } from './dto/update-tipos-jaba.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@ApiTags('Tipos de Jaba')
@Controller('tipos-jaba')
export class TiposJabaController {
  constructor(private readonly tiposJabaService: TiposJabaService) { }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo tipo de jaba' })
  create(@Body() createTipoJabaDto: CreateTipoJabaDto) {
    return this.tiposJabaService.create(createTipoJabaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tipos de jaba (opcionalmente filtrar por estado)' })
  findAll(@Query('estado') estado?: string) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.tiposJabaService.findAll(estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo de jaba por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tiposJabaService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un tipo de jaba' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTipoJabaDto: UpdateTipoJabaDto) {
    return this.tiposJabaService.update(id, updateTipoJabaDto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar un tipo de jaba (soft delete)' })
  changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto) {
    return this.tiposJabaService.changeState(id, updateStateDto.estado);
  }
}