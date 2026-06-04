import {
  Controller, Get, Post, Body, Put, Param, Delete, Query, ParseIntPipe, Patch,
} from '@nestjs/common';
import { EntregasService } from './entregas.service';
import { CreateEntregaDto } from './dto/create-entregas.dto';
import { UpdateEntregaDto } from './dto/update-entregas.dto';
import { QueryEntregasDto } from './dto/query-entregas.dto';

@Controller('entregas')
export class EntregasController {
  constructor(private readonly service: EntregasService) { }

  @Post()
  create(@Body() dto: CreateEntregaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryEntregasDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEntregaDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/estado')
  changeState(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: string) {
    return this.service.changeState(id, estado);
  }

  @Patch(':id/firmar')
  sign(@Param('id', ParseIntPipe) id: number, @Body('nombre_recibe') nombre_recibe?: string) {
    return this.service.sign(id, nombre_recibe);
  }
}

// Endpoints anidados en guías-operativas y items-reparto
// En GuiasOperativasController:
// @Get(':id/entregas')
// findEntregasByGuia(@Param('id') id: number) { return this.entregasService.findByGuia(id); }

// En ItemsRepartoController:
// @Get(':id/entregas')
// findEntregasByItem(@Param('id') id: number) { return this.entregasService.findByItemReparto(id); }