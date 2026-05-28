  import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
  import { PuestosService } from './puestos.service';
  import { CreatePuestoDto } from './dto/create-puesto.dto';
  import { UpdatePuestoDto } from './dto/update-puesto.dto';

  @Controller('puestos')
  export class PuestosController {
    constructor(private readonly puestosService: PuestosService) {}

    @Post()
    create(@Body() createPuestoDto: CreatePuestoDto) {
      return this.puestosService.create(createPuestoDto);
    }

    @Get()
    findAll() {
      return this.puestosService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
      return this.puestosService.findOne(id);
    }

    @Put(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updatePuestoDto: UpdatePuestoDto) {
      return this.puestosService.update(id, updatePuestoDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
      return this.puestosService.remove(id);
    }

    // Endpoints adicionales
    @Get('mercados/:mercadoId/puestos')
    findByMercado(@Param('mercadoId', ParseIntPipe) mercadoId: number) {
      return this.puestosService.findByMercado(mercadoId);
    }

    @Get('clientes/:clienteId/puestos')
    findByCliente(@Param('clienteId', ParseIntPipe) clienteId: number) {
      return this.puestosService.findByCliente(clienteId);
    }
  }