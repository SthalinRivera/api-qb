import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OperacionesCargaService } from './operaciones-carga.service';
import { CreateOperacionCargaDto } from './dto/create-operaciones-carga.dto';
import { UpdateOperacionCargaDto } from './dto/update-operaciones-carga.dto';
import { QueryOperacionesCargaDto } from './dto/query-operaciones-carga.dto';
import { DetalleCargaService } from '../detalle-carga/detalle-carga.service';
import { CreateDetalleCargaForOperacionDto } from '../detalle-carga/dto/create-detalle-carga-for-operacion.dto';

@Controller('operaciones-carga')
export class OperacionesCargaController {
  constructor(
    private readonly service: OperacionesCargaService,
    private readonly detalleService: DetalleCargaService,
  ) { }

  // ============================================
  // RUTAS FIJAS (sin :id) - van primero
  // ============================================

  @Get('detalles-pendientes')
  async findAllDetallesRepartoPendientes() {
    return this.service.findAllDetallesRepartoPendientes();
  }

  @Post()
  create(@Body() createDto: CreateOperacionCargaDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll(@Query() query: QueryOperacionesCargaDto) {
    return this.service.findAll(query);
  }

  // ============================================
  // RUTAS CON :id (van después)
  // ============================================

  // Esta ruta tiene más segmentos, debe ir antes de @Get(':id')
  @Get(':id/detalles')
  findDetallesByOperacion(@Param('id', ParseIntPipe) id: number) {
    return this.detalleService.findByOperacion(id);
  }

  @Get(':id/detalles-reparto-pendientes')
  async findDetallesRepartoPendientes(@Param('id', ParseIntPipe) id: number) {
    return this.service.findDetallesRepartoPendientes(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateOperacionCargaDto,
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Patch(':id/estado')
  changeState(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: string,
  ) {
    return this.service.changeState(id, estado);
  }

  @Post(':id/generar-guias')
  async generarGuias(@Param('id', ParseIntPipe) id: number) {
    return this.service.generarGuias(id);
  }

  @Post(':id/detalles')
  createDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateDetalleCargaForOperacionDto,
  ) {
    return this.detalleService.create(id, createDto);
  }


  // operaciones-carga.controller.ts
  @Post(':id/generar-guias-por-puesto')
  async generarGuiasPorPuesto(@Param('id', ParseIntPipe) id: number) {
    return this.service.generarGuias(id);
  }
}