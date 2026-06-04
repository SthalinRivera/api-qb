import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { LugarOperativoService } from './lugares-operativos.service';
import { CreateLugarOperativoDto } from './dto/create-lugar-operativo.dto';
import { UpdateLugarOperativoDto } from './dto/update-lugar-operativo.dto';
import { DetalleCargaService } from '../detalle-carga/detalle-carga.service';

@Controller('lugares-operativos')
export class LugarOperativoController {
  constructor(private readonly lugarOperativoService: LugarOperativoService) { }

  @Post()
  create(@Body() createLugarOperativoDto: CreateLugarOperativoDto) {
    return this.lugarOperativoService.create(createLugarOperativoDto);
  }

  @Get()
  findAll() {
    return this.lugarOperativoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lugarOperativoService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLugarOperativoDto: UpdateLugarOperativoDto) {
    return this.lugarOperativoService.update(id, updateLugarOperativoDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lugarOperativoService.remove(id);
  }

  // Endpoint adicional: mercados por sede
  @Get('sedes/:sedeId/mercados')
  findBySede(@Param('sedeId', ParseIntPipe) sedeId: number) {
    return this.lugarOperativoService.findBySede(sedeId);
  }
}