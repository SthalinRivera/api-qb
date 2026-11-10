import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PrismaService } from '../../config/prisma/prisma.service';

class QueryUbigeoDto {
  @IsOptional() @Matches(/^\d{2}$/) id_departamento?: string;
  @IsOptional() @Matches(/^\d{4}$/) id_provincia?: string;
  @IsOptional() @IsString() buscar?: string;
}

@Controller('ubigeo')
export class UbigeoController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('departamentos')
  departamentos() { return this.prisma.scoped.departamentos.findMany({ orderBy: { nombre: 'asc' } }); }
  @Get('provincias')
  provincias(@Query() q: QueryUbigeoDto) {
    return this.prisma.scoped.provincias.findMany({ where: { id_departamento: q.id_departamento }, orderBy: { nombre: 'asc' } });
  }
  @Get('distritos')
  distritos(@Query() q: QueryUbigeoDto) {
    return this.prisma.scoped.distritos.findMany({ where: { id_provincia: q.id_provincia,
      ...(q.id_departamento ? { provincias: { id_departamento: q.id_departamento } } : {}),
      ...(q.buscar ? { nombre: { contains: q.buscar, mode: 'insensitive' as const } } : {}),
    }, include: { provincias: { include: { departamentos: true } } }, orderBy: { nombre: 'asc' } });
  }
}
