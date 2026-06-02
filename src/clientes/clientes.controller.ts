// src/clientes/clientes.controller.ts
import {
  Controller, Get, Post, Body, Put, Param, Delete, Query, ParseIntPipe, Patch
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ClienteSedeDto } from './dto/cliente-sede.dto';
import { AsignarPuestoDto } from './dto/asignar-puesto.dto';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) { }

  @Post()
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  findAll(@Query('buscar') buscar?: string) {
    return this.clientesService.findAll(buscar);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateClienteDto: UpdateClienteDto) {
    return this.clientesService.update(id, updateClienteDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.remove(id);
  }

  // Endpoints para sedes del cliente
  @Get(':id/sedes')
  getSedes(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.getSedesByCliente(id);
  }

  @Post('sedes')
  associateSede(@Body() dto: ClienteSedeDto) {
    return this.clientesService.associateSede(dto);
  }
  @Patch(':id/sedes/:sedeId')
  updateSedeRelacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('sedeId', ParseIntPipe) sedeId: number,
    @Body('tipo_relacion') tipoRelacion: string,
  ) {
    return this.clientesService.updateSedeRelacion(id, sedeId, tipoRelacion);
  }

  @Delete(':id/sedes/:sedeId')
  removeSede(
    @Param('id', ParseIntPipe) id: number,
    @Param('sedeId', ParseIntPipe) sedeId: number,
  ) {
    return this.clientesService.removeSede(id, sedeId);
  }
  // Endpoints para puestos (roles) del cliente
  @Get(':id/puestos')
  getPuestos(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.getPuestosByCliente(id);
  }

  @Post(':id/puestos')
  assignPuesto(@Param('id', ParseIntPipe) id: number, @Body() dto: AsignarPuestoDto) {
    return this.clientesService.assignPuesto(id, dto);
  }

  @Delete(':id/puestos/:puestoId')
  removePuesto(
    @Param('id', ParseIntPipe) id: number,
    @Param('puestoId', ParseIntPipe) puestoId: number
  ) {
    return this.clientesService.removePuesto(id, puestoId);
  }
}