import { Controller, Get, Post, Put, Delete, Body, Patch, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@ApiTags('Categorías')
@Controller('categorias')
export class CategoriasController {
    constructor(private readonly categoriasService: CategoriasService) {}

    @Post()
    @ApiOperation({ summary: 'Crear una categoría' })
    create(@Body() dto: CreateCategoriaDto) {
        return this.categoriasService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar categorías' })
    findAll(@Query('estado') estado?: string) {
        const estadoBool = estado === 'true' ? true : estado === 'false' ? false : undefined;
        return this.categoriasService.findAll(estadoBool);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener una categoría por ID' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.categoriasService.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar una categoría' })
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoriaDto) {
        return this.categoriasService.update(id, dto);
    }

    @Patch(':id/estado')
    @ApiOperation({ summary: 'Activar/desactivar categoría' })
    changeState(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: boolean) {
        return this.categoriasService.changeState(id, estado);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar categoría' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.categoriasService.remove(id);
    }
}
