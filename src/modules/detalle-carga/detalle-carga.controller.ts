import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { DetalleCargaService } from './detalle-carga.service';
import { UpdateDetalleCargaDto } from './dto/update-detalle-carga.dto';
import { CreateDetalleCalidadDto } from './dto/create-detalle-calidad.dto';
import { UpdateDetalleCalidadDto } from './dto/update-detalle-calidad.dto';
import { ItemsRepartoService } from '../items-reparto/items-reparto.service';
import { CreateItemRepartoDto } from '../items-reparto/dto/create-items-reparto.dto';

@Controller('detalle-carga')
export class DetalleCargaController {
  constructor(
    private readonly service: DetalleCargaService,
    private readonly itemsRepartoService: ItemsRepartoService, // ✅ Agregado
  ) { }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDetalleCargaDto,
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // Calidades
  @Get(':id/calidades')
  findCalidades(@Param('id', ParseIntPipe) id: number) {
    return this.service.findCalidadesByDetalle(id);
  }

  @Post(':id/calidades')
  addCalidad(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: CreateDetalleCalidadDto,
  ) {
    return this.service.addCalidad(id, createDto);
  }

  @Put('calidades/:id')
  updateCalidad(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDetalleCalidadDto,
  ) {
    return this.service.updateCalidad(id, updateDto);
  }

  @Delete('calidades/:id')
  removeCalidad(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeCalidad(id);
  }

  // Repartos
  @Get(':id/repartos')
  findRepartosByDetalle(@Param('id', ParseIntPipe) id: number) {
    return this.itemsRepartoService.findByDetalleCarga(id);
  }

  @Post(':id/repartos')
  createRepartoFromDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateItemRepartoDto,
  ) {
    dto.id_detalle_carga = id;
    return this.itemsRepartoService.create(dto);
  }
}