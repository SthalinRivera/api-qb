import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { QueryClientesDto } from './dto/query-clientes.dto';
import { ClienteSedeDto } from './dto/cliente-sede.dto';
import { AsignarPuestoDto } from './dto/asignar-puesto.dto';
import { CreateFullClienteDto } from './dto/create-full-cliente.dto';
import { UpdateFullClienteDto } from './dto/update-full-cliente.dto';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) { }

  @Post()
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto);
  }
  @Post('full')
  async createFull(@Body() dto: CreateFullClienteDto) {
    return this.clientesService.createFull(dto);
  }
  @Put(':id/full')
  async updateFull(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFullClienteDto) {
    return this.clientesService.updateFull(id, dto);
  }

  @Get()
  findAll(@Query() query: QueryClientesDto) {
    if (query.page) {
      return this.clientesService.findAllPaginated(query);
    }
    return this.clientesService.findAll(query.buscar, query);
  }

  @Get('all')
  findAllWithoutPagination(@Query() query: QueryClientesDto) {
    return this.clientesService.findAll(query.buscar, query);
  }

  @Get('asignaciones-puestos')
  findAllClientesPuestos() {
    return this.clientesService.findAllClientesPuestos();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateClienteDto: UpdateClienteDto) {
    return this.clientesService.update(id, updateClienteDto);
  }

  @Patch(':id/estado')
  changeState(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: boolean) {
    return this.clientesService.changeState(id, estado);
  }

  // Sedes
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
  removeSede(@Param('id', ParseIntPipe) id: number, @Param('sedeId', ParseIntPipe) sedeId: number) {
    return this.clientesService.removeSede(id, sedeId);
  }

  // Puestos
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
    @Param('puestoId', ParseIntPipe) puestoId: number,
    @Query('id_cliente_puesto', new ParseIntPipe({ optional: true })) ocupacionId?: number,
  ) {
    return this.clientesService.removePuesto(id, puestoId, ocupacionId);
  }
}