import {
  Controller, Get, Post, Body, Put, Param, Delete, Query, ParseIntPipe, Patch,
} from '@nestjs/common';
import { GuiasOperativasService } from './guias-operativas.service';
import { CreateGuiaOperativaDto } from './dto/create-guias-operativa.dto';
import { UpdateGuiaOperativaDto } from './dto/update-guias-operativa.dto';
import { QueryGuiasOperativasDto } from './dto/query-guias-operativas.dto';
// Elimina importaciones de CreateGuiaDetalleDto y UpdateGuiaDetalleDto

@Controller('guias-operativas')
export class GuiasOperativasController {
  constructor(private readonly service: GuiasOperativasService) { }

  @Post()
  create(@Body() dto: CreateGuiaOperativaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryGuiasOperativasDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGuiaOperativaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Patch(':id/firmar')
  sign(@Param('id', ParseIntPipe) id: number) {
    return this.service.sign(id);
  }

  @Patch(':id/estado')
  changeState(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: string) {
    return this.service.changeState(id, estado);
  }

  // Los siguientes endpoints están comentados porque la tabla guia_operativa_detalle no existe en el esquema
  // @Get(':id/detalles')
  // getDetalles(...) { ... }

  // @Post(':id/detalles')
  // addDetalle(...) { ... }
}

// Elimina por completo el controlador GuiaDetalleController
// @Controller('guia-operativa-detalle')
// export class GuiaDetalleController { ... }