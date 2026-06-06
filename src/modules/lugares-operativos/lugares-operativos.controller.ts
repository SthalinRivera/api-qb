import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { LugaresOperativosService } from './lugares-operativos.service';
import { CreateLugarOperativoDto } from './dto/create-lugar-operativo.dto';
import { UpdateLugarOperativoDto } from './dto/update-lugar-operativo.dto';
import { DetalleCargaService } from '../detalle-carga/detalle-carga.service';

@Controller('lugares-operativos')
export class LugaresOperativosController {
  constructor(private readonly lugaresOperativosService: LugaresOperativosService) { }

  @Post()
  create(@Body() createLugarOperativoDto: CreateLugarOperativoDto) {
    return this.lugaresOperativosService.create(createLugarOperativoDto);
  }

  @Get()
  findAll() {
    return this.lugaresOperativosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lugaresOperativosService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLugarOperativoDto: UpdateLugarOperativoDto) {
    return this.lugaresOperativosService.update(id, updateLugarOperativoDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lugaresOperativosService.remove(id);
  }

  // Endpoint adicional: mercados por sede
  @Get('sedes/:sedeId/mercados')
  findBySede(@Param('sedeId', ParseIntPipe) sedeId: number) {
    return this.lugaresOperativosService.findBySede(sedeId);
  }
}