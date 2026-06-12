import { Controller, Get, Post, Body, Patch, Param, Query, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CamionesService } from './camiones.service';
import { CreateCamionDto } from './dto/create-camione.dto';
import { UpdateCamionDto } from './dto/update-camione.dto';
import { UpdateStateDto } from './dto/update-state.dto';

@ApiTags('Camiones')
@Controller('camiones')
export class CamionesController {
  constructor(private readonly camionesService: CamionesService) { }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo camión' })
  create(@Body() createCamionDto: CreateCamionDto) {
    return this.camionesService.create(createCamionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar camiones (opcionalmente filtrar por estado)' })
  findAll(@Query('estado') estado?: string) {
    const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
    return this.camionesService.findAll(estadoBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un camión por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.camionesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un camión' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCamionDto: UpdateCamionDto) {
    return this.camionesService.update(id, updateCamionDto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar un camión (soft delete)' })
  changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto) {
    return this.camionesService.changeState(id, updateStateDto.estado);
  }
}