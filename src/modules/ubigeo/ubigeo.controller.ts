import { UbigeoPipe } from '../../common/pipes/ubigeo.pipe';
import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { IsOptional, IsString, Matches, IsIn } from 'class-validator';
import { PrismaService } from '../../config/prisma/prisma.service';

export class QueryUbigeoDto {
  @IsOptional() @IsIn(['true', 'false']) empresa?: string;
  @IsOptional() @Matches(/^\d{2}$/) id_departamento?: string;
  @IsOptional() @Matches(/^\d{4}$/) id_provincia?: string;
  @IsOptional() @IsString() buscar?: string;
}

@Controller(['ubicaciones', 'ubigeo'])
export class UbigeoController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('departamentos')
  departamentos() { return this.prisma.scoped.departamentos.findMany({ orderBy: { nombre: 'asc' } }); }
  @Get('provincias')
  provincias(@Query() q: QueryUbigeoDto) {
    return this.prisma.scoped.provincias.findMany({ where: { id_departamento: q.id_departamento }, orderBy: { nombre: 'asc' } });
  }
  @Get()
  listar(@Query() q: QueryUbigeoDto) { return this.distritos(q); }
  @Get('distritos')
  distritos(@Query() q: QueryUbigeoDto) {
    return this.prisma.scoped.distritos.findMany({ where: { id_provincia: q.id_provincia,
      ...(q.empresa === 'true' ? { lugares_operativos: { some: { estado: true, empresa_lugares: { some: { id_empresa: this.prisma.empresaId, estado: true } } } } } : {}),
      ...(q.id_departamento ? { provincias: { id_departamento: q.id_departamento } } : {}),
      ...(q.buscar ? { nombre: { contains: q.buscar, mode: 'insensitive' as const } } : {}),
    }, include: { provincias: { include: { departamentos: true } } }, orderBy: { nombre: 'asc' } });
  }
  @Get(':ubigeo')
  async findOne(@Param('ubigeo', UbigeoPipe) id_ubigeo: string) {
    const distrito = await this.prisma.scoped.distritos.findUnique({ where: { id_ubigeo }, include: { provincias: { include: { departamentos: true } } } });
    if (!distrito) throw new NotFoundException('Ubicación no encontrada');
    return distrito;
  }
}
