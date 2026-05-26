import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { VariedadesService } from './variedades.service';
import { CreateVariedadDto } from './dto/create-variedade.dto';
import { UpdateVariedadDto } from './dto/update-variedade.dto';

@Controller('variedades')
export class VariedadesController {
  constructor(private readonly variedadesService: VariedadesService) { }

  @Post()
  create(@Body() createVariedadDto: CreateVariedadDto) {
    return this.variedadesService.create(createVariedadDto);
  }

  @Get()
  findAll() {
    return this.variedadesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.variedadesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateVariedadDto: UpdateVariedadDto) {
    return this.variedadesService.update(id, updateVariedadDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.variedadesService.remove(id);
  }

  // Endpoint especial: listar variedades de una fruta
  @Get('frutas/:frutaId/variedades')
  findByFruta(@Param('frutaId', ParseIntPipe) frutaId: number) {
    return this.variedadesService.findByFruta(frutaId);
  }
}