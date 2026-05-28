import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { MercadosService } from './mercados.service';
import { CreateMercadoDto } from './dto/create-mercado.dto';
import { UpdateMercadoDto } from './dto/update-mercado.dto';

@Controller('mercados')
export class MercadosController {
  constructor(private readonly mercadosService: MercadosService) {}

  @Post()
  create(@Body() createMercadoDto: CreateMercadoDto) {
    return this.mercadosService.create(createMercadoDto);
  }

  @Get()
  findAll() {
    return this.mercadosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mercadosService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMercadoDto: UpdateMercadoDto) {
    return this.mercadosService.update(id, updateMercadoDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mercadosService.remove(id);
  }

  // Endpoint adicional: mercados por sede
  @Get('sedes/:sedeId/mercados')
  findBySede(@Param('sedeId', ParseIntPipe) sedeId: number) {
    return this.mercadosService.findBySede(sedeId);
  }
}