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
import { ClienteUbicacionDto } from './dto/cliente-ubicacion.dto';
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

  // Ubicaciones
  @Get(':id/ubicaciones')
  getUbicaciones(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.getUbicacionesByCliente(id);
  }

  @Post('ubicaciones')
  associateUbicacion(@Body() dto: ClienteUbicacionDto) {
    return this.clientesService.associateUbicacion(dto);
  }

  @Patch(':id/ubicaciones/:relacionId')
  updateUbicacionRelacion(
    @Param('id', ParseIntPipe) id: number,
    @Param('relacionId', ParseIntPipe) relacionId: number,
    @Body('tipo_relacion') tipoRelacion: string,
  ) {
    return this.clientesService.updateUbicacionRelacion(id, relacionId, tipoRelacion);
  }

  @Delete(':id/ubicaciones/:relacionId')
  removeUbicacion(@Param('id', ParseIntPipe) id: number, @Param('relacionId', ParseIntPipe) relacionId: number) {
    return this.clientesService.removeUbicacion(id, relacionId);
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