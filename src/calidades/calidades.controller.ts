import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { CalidadesService } from './calidades.service';
import { CreateCalidadDto } from './dto/create-calidade.dto';
import { UpdateCalidadDto } from './dto/update-calidade.dto';

@Controller('calidades')
export class CalidadesController {
  constructor(private readonly calidadesService: CalidadesService) {}

  @Post()
  create(@Body() createCalidadDto: CreateCalidadDto) {
    return this.calidadesService.create(createCalidadDto);
  }

  @Get()
  findAll() {
    return this.calidadesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.calidadesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCalidadDto: UpdateCalidadDto) {
    return this.calidadesService.update(id, updateCalidadDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.calidadesService.remove(id);
  }
}