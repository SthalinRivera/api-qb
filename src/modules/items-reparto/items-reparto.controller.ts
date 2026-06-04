import {
  Controller, Get, Post, Body, Put, Param, Delete, Patch, Query, ParseIntPipe,
} from '@nestjs/common';
import { ItemsRepartoService } from './items-reparto.service';
import { CreateItemRepartoDto } from './dto/create-items-reparto.dto';
import { UpdateItemRepartoDto } from './dto/update-items-reparto.dto';
import { QueryItemsRepartoDto } from './dto/query-items-reparto.dto';

@Controller('items-reparto')
export class ItemsRepartoController {
  constructor(private readonly service: ItemsRepartoService) { }

  @Post()
  create(@Body() dto: CreateItemRepartoDto) {
    return this.service.create(dto);
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

  @Patch(':id/estado')
  changeState(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: string) {
    return this.service.changeState(id, estado);
  }
}