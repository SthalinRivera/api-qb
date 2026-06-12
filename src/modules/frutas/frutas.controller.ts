import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { FrutasService } from './frutas.service';
import { CreateFrutaDto } from './dto/create-fruta.dto';
import { UpdateFrutaDto } from './dto/update-fruta.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@ApiTags('Frutas')
@Controller('frutas')
export class FrutasController {
  constructor(private readonly frutasService: FrutasService) { }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva fruta' })
  create(@Body() createFrutaDto: CreateFrutaDto) {
    return this.frutasService.create(createFrutaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar frutas (opcionalmente filtrar por estado)' })
  findAll(@Query('estado') estado?: string) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.frutasService.findAll(estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una fruta por ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.frutasService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar parcialmente una fruta' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateFrutaDto: UpdateFrutaDto) {
    return this.frutasService.update(id, updateFrutaDto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar una fruta (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateStateDto })
  changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto) {
    return this.frutasService.changeState(id, updateStateDto.estado);
  }
}