// src/roles-usuarios/roles-usuarios.controller.ts
import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { RolesUsuariosService } from './roles-usuarios.service';
import { CreateRolDto } from './dto/create-roles-usuario.dto';
import { UpdateRolDto } from './dto/update-roles-usuario.dto';

@Controller('roles-usuarios')
export class RolesUsuariosController {
  constructor(private readonly rolesService: RolesUsuariosService) { }

  @Post()
  create(@Body() createRolDto: CreateRolDto) {
    return this.rolesService.create(createRolDto);
  }

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRolDto: UpdateRolDto) {
    return this.rolesService.update(id, updateRolDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }

  
}