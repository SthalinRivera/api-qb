import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Patch,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ItemsRepartoService } from './items-reparto.service';
import { CreateItemRepartoDto } from './dto/create-items-reparto.dto';
import { UpdateItemRepartoDto } from './dto/update-items-reparto.dto';
import { QueryItemsRepartoDto } from './dto/query-items-reparto.dto';
import { UpdateItemsRepartoDetalleDto } from './dto/update-items-reparto-detalle.dto';
import { CreateItemsRepartoDetalleDto } from './dto/create-items-reparto-detalle.dto';
import { CreateItemRepartoConDetallesDto } from './dto/create-items-reparto-con-detalles.dto';
import { CreateItemsRepartoMultipleDto } from './dto/create-items-reparto-multiple.dto';

@Controller('items-reparto')
export class ItemsRepartoController {
  constructor(private readonly service: ItemsRepartoService) { }

  // ==================== ÍTEMS PRINCIPALES ====================
  @Post()
  create(@Body() dto: CreateItemRepartoDto) {
    return this.service.create(dto);
  }

  @Post('from-calidades')
  createFromCalidades(@Body() dto: CreateItemRepartoConDetallesDto) {
    return this.service.createFromCalidades(dto);
  }

  @Get()
  findAll(@Query() query: QueryItemsRepartoDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateItemRepartoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ==================== DETALLES ====================
  @Post(':id/detalle')
  addDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateItemsRepartoDetalleDto,
  ) {
    return this.service.addDetalle(id, dto);
  }
  @Post('from-calidades-multiple')
  createMultipleFromCalidades(@Body() dto: CreateItemsRepartoMultipleDto) {
    return this.service.createMultipleFromCalidades(dto);
  }
  @Get('detalle')
  findAllDetalles() {
    return this.service.findAllDetalles();
  }

  @Get(':id/detalle')
  findDetallesByItem(@Param('id', ParseIntPipe) id: number) {
    return this.service.findAllDetalles(id);
  }

  @Get('detalle/:detalleId')
  findOneDetalle(@Param('detalleId', ParseIntPipe) detalleId: number) {
    return this.service.findOneDetalle(detalleId);
  }

  @Put('detalle/:detalleId')
  updateDetalle(
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: UpdateItemsRepartoDetalleDto,
  ) {
    return this.service.updateDetalle(detalleId, dto);
  }

  @Delete('detalle/:detalleId')
  removeDetalle(@Param('detalleId', ParseIntPipe) detalleId: number) {
    return this.service.removeDetalle(detalleId);
  }

  // ==================== ENDPOINTS ANIDADOS (útiles para frontend) ====================
  @Get('detalle-carga/:detalleId')
  findByDetalleCarga(@Param('detalleId', ParseIntPipe) detalleId: number) {
    return this.service.findByDetalleCarga(detalleId);
  }
}