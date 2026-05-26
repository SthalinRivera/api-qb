// src/puestos/puestos.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('puestos')
export class PuestosController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    findAll() {
        return this.prisma.puestos.findMany({
            where: { estado: true },
            orderBy: { numero_puesto: 'asc' }
        });
    }
}