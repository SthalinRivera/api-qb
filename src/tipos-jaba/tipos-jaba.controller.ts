import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { TiposJabaService } from './tipos-jaba.service';
import { CreateTipoJabaDto } from './dto/create-tipos-jaba.dto';
import { UpdateTipoJabaDto } from './dto/update-tipos-jaba.dto';

@Controller('tipos-jaba')
export class TiposJabaController {
  constructor(private readonly tiposJabaService: TiposJabaService) { }

  @Post()
  create(@Body() createTipoJabaDto: CreateTipoJabaDto) {
    return this.tiposJabaService.create(createTipoJabaDto);
  }

  @Get()
  findAll() {
    return this.tiposJabaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tiposJabaService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateTipoJabaDto: UpdateTipoJabaDto) {
    return this.tiposJabaService.update(id, updateTipoJabaDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tiposJabaService.remove(id);
  }
}