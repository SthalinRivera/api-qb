import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { PuestoSeccionesService } from './puesto-secciones.service';
import { CreateSeccionDto } from './dto/create-puesto-seccione.dto';
import { UpdateSeccionDto } from './dto/update-puesto-seccione.dto';

@Controller('puestos')
export class PuestoSeccionesController {
  constructor(private readonly seccionesService: PuestoSeccionesService) {}

  // 1️⃣ Rutas fijas (sin parámetros dinámicos)
  @Get('secciones')               // GET /puestos/secciones
  findAll() {
    return this.seccionesService.findAll();
  }

  @Post('secciones')              // POST /puestos/secciones
  create(@Body() createSeccionDto: CreateSeccionDto) {
    return this.seccionesService.create(createSeccionDto);
  }

  @Get('secciones/:id')           // GET /puestos/secciones/:id
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seccionesService.findOne(id);
  }

  @Put('secciones/:id')           // PUT /puestos/secciones/:id
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSeccionDto: UpdateSeccionDto) {
    return this.seccionesService.update(id, updateSeccionDto);
  }

  @Delete('secciones/:id')        // DELETE /puestos/secciones/:id
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.seccionesService.remove(id);
  }

  // 2️⃣ Ruta con parámetro dinámico (va al final)
  @Get(':puestoId/secciones')     // GET /puestos/:puestoId/secciones
  findByPuesto(@Param('puestoId', ParseIntPipe) puestoId: number) {
    return this.seccionesService.findAllByPuesto(puestoId);
  }
}