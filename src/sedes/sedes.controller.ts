import { Controller, Get, Post, Body, Put, Param, Delete, Query, ParseIntPipe, ParseBoolPipe } from '@nestjs/common';
import { SedesService } from './sedes.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

@Controller('sedes')
export class SedesController {
  constructor(private readonly sedesService: SedesService) {}

  @Post()
  create(@Body() createSedeDto: CreateSedeDto) {
    return this.sedesService.create(createSedeDto);
  }

  @Get()
  findAll(@Query('tipo') tipo?: string) {
    return this.sedesService.findAll(tipo);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sedesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSedeDto: UpdateSedeDto) {
    return this.sedesService.update(id, updateSedeDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sedesService.remove(id);
  }
}