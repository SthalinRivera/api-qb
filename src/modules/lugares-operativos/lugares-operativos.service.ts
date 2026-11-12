import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateLugarOperativoDto } from './dto/create-lugar-operativo.dto';
import { UpdateLugarOperativoDto } from './dto/update-lugar-operativo.dto';
@Injectable()
export class LugaresOperativosService {
  constructor(private readonly prisma: PrismaService) {}
  private empresa(id?: number) {
    if (id !== undefined && BigInt(id) !== this.prisma.empresaId) throw new ForbiddenException('Empresa no autorizada');
  }
  private include() { return { distritos: true, empresa_lugares: { where: { id_empresa: this.prisma.empresaId } } }; }
  private present(lugar: any) {
    const { empresa_lugares, ...data } = lugar;
    return { ...data, estado_catalogo: data.estado, estado: empresa_lugares?.[0]?.estado ?? false };
  }
  async create(dto: CreateLugarOperativoDto) {
    this.empresa(dto.id_empresa);
    // The catalog is shared. Link a matching place without overwriting its data.
    return this.prisma.$transaction(async tx => {
      const distrito = await tx.distritos.findUnique({ where: { id_ubigeo: dto.id_ubigeo } });
      if (!distrito) throw new NotFoundException('Distrito no encontrado');
      const lugar = await tx.lugares_operativos.upsert({
        where: { id_ubigeo_nombre: { id_ubigeo: dto.id_ubigeo, nombre: dto.nombre } },
        create: { id_ubigeo: dto.id_ubigeo, nombre: dto.nombre, tipo_lugar: dto.tipo_lugar, direccion_referencia: dto.direccion_referencia, observaciones: dto.observaciones, estado: true }, update: {},
      });
      await tx.empresa_lugares.upsert({ where: { id_empresa_id_lugar: { id_empresa: this.prisma.empresaId, id_lugar: lugar.id_lugar } }, create: { id_empresa: this.prisma.empresaId, id_lugar: lugar.id_lugar, estado: dto.estado ?? true }, update: { estado: dto.estado ?? true } });
      return { ...lugar, estado_catalogo: lugar.estado, estado: dto.estado ?? true };
    });
  }
  async findAll(empresaId: number, estado?: boolean) {
    this.empresa(empresaId);
    return (await this.prisma.scoped.lugares_operativos.findMany({ where: { empresa_lugares: { some: { id_empresa: this.prisma.empresaId, estado } } }, include: this.include(), orderBy: { nombre: 'asc' } })).map(lugar => this.present(lugar));
  }
  async findOne(id: number, empresaId?: number) {
    this.empresa(empresaId);
    const lugar = await this.prisma.scoped.lugares_operativos.findUnique({ where: { id_lugar: BigInt(id) }, include: this.include() });
    if (!lugar) throw new NotFoundException('Lugar operativo no encontrado');
    return this.present(lugar);
  }
  async update(id: number, dto: UpdateLugarOperativoDto) {
    this.empresa(dto.id_empresa);
    await this.findOne(id);
    const { id_empresa, estado, ...data } = dto;
    return this.prisma.scoped.$transaction(async tx => {
      if (Object.values(data).some(value => value !== undefined)) await tx.lugares_operativos.update({ where: { id_lugar: BigInt(id) }, data });
      if (estado !== undefined) await tx.empresa_lugares.update({ where: { id_empresa_id_lugar: { id_empresa: this.prisma.empresaId, id_lugar: BigInt(id) } }, data: { estado } });
      return this.present(await tx.lugares_operativos.findUnique({ where: { id_lugar: BigInt(id) }, include: this.include() }));
    });
  }
  async changeState(id: number, estado: boolean, empresaId?: number) {
    this.empresa(empresaId);
    await this.findOne(id);
    // Activation belongs to the company-place link, not the shared catalog.
    return this.update(id, { estado });
  }
  async findByUbicacion(id_ubigeo: string, estado?: boolean) {
    return (await this.prisma.scoped.lugares_operativos.findMany({ where: { id_ubigeo, empresa_lugares: { some: { id_empresa: this.prisma.empresaId, estado } } }, include: this.include(), orderBy: { nombre: 'asc' } })).map(lugar => this.present(lugar));
  }
}
