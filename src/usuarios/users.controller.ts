import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('usuarios')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    // 📌 GET ALL
    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    // 📌 GET BY ID
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(Number(id));
    }

    // 📌 CREATE
    @Post()
    create(@Body() data: any) {
        return this.usersService.create(data);
    }

    // 📌 UPDATE
    @Patch(':id')
    update(@Param('id') id: string, @Body() data: any) {
        return this.usersService.update(Number(id), data);
    }

    // 📌 DELETE
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.remove(Number(id));
    }
}