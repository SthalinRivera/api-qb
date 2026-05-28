import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { CamionesService } from './camiones.service';
import { CreateCamionDto } from './dto/create-camione.dto';
import { UpdateCamionDto } from './dto/update-camione.dto';

@Controller('camiones')
export class CamionesController {
  constructor(private readonly camionesService: CamionesService) { }

  @Post()
  create(@Body() createCamionDto: CreateCamionDto) {
    return this.camionesService.create(createCamionDto);
  }

  @Get()
  findAll() {
    // Nota: si se necesita filtrar por tipo_propiedad, se puede añadir un parámetro de consulta,
    // pero el modelo actual no tiene ese campo. Se deja para futura extensión.
    return this.camionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.camionesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCamionDto: UpdateCamionDto) {
    return this.camionesService.update(id, updateCamionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.camionesService.remove(id);
  }
}