import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { UpdateStateDto } from './dto/update-state.dto'; // o desde common
import { Empresa } from './entities/empresa.entity';

@ApiTags('Empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) { }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva empresa' })
  @ApiResponse({ status: 201, description: 'Empresa creada exitosamente', type: Empresa })
  create(@Body() createEmpresaDto: CreateEmpresaDto): Promise<Empresa> {
    return this.empresasService.create(createEmpresaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las empresas' })
  @ApiResponse({ status: 200, description: 'Lista de empresas', type: [Empresa] })
  findAll(): Promise<Empresa[]> {
    return this.empresasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una empresa por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Empresa encontrada', type: Empresa })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Empresa> {
    return this.empresasService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos de una empresa' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateEmpresaDto })
  @ApiResponse({ status: 200, description: 'Empresa actualizada', type: Empresa })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEmpresaDto: UpdateEmpresaDto): Promise<Empresa> {
    return this.empresasService.update(id, updateEmpresaDto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Activar o desactivar una empresa (eliminación lógica)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateStateDto })
  @ApiResponse({ status: 200, description: 'Estado actualizado', type: Empresa })
  changeState(@Param('id', ParseIntPipe) id: number, @Body() updateStateDto: UpdateStateDto): Promise<Empresa> {
    return this.empresasService.changeState(id, updateStateDto.estado);
  }

  // ❌ No hay @Delete()
}