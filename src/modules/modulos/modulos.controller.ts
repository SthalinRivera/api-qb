import { Controller, Get, Post, Put, Delete, Body, Patch, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ModulosService } from './modulos.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';

@ApiTags('Módulos')
@Controller('modulos')
export class ModulosController {
    constructor(private readonly modulosService: ModulosService) {}

    @Post()
    @ApiOperation({ summary: 'Crear un módulo' })
    create(@Body() dto: CreateModuloDto) {
        return this.modulosService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar módulos' })
    findAll(@Query('estado') estado?: string) {
        const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
        return this.modulosService.findAll(estadoBool);
    }

    @Get('categoria/:idCategoria')
    @ApiOperation({ summary: 'Listar módulos por categoría' })
    findByCategoria(@Param('idCategoria', ParseIntPipe) idCategoria: number) {
        return this.modulosService.findByCategoria(idCategoria);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un módulo por ID' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.modulosService.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un módulo' })
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModuloDto) {
        return this.modulosService.update(id, dto);
    }

    @Patch(':id/estado')
    @ApiOperation({ summary: 'Activar/desactivar módulo' })
    changeState(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: boolean) {
        return this.modulosService.changeState(id, estado);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar módulo' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.modulosService.remove(id);
    }
}
