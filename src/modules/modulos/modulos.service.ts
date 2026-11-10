import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';

@Injectable()
export class ModulosService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateModuloDto) {
        return this.prisma.scoped.modulos.create({
            data: {
                nombre: dto.nombre,
                ruta: dto.ruta,
                id_categoria: BigInt(dto.id_categoria),
                orden: dto.orden ?? 0,
                estado: dto.estado ?? true,
            },
            include: { categorias: true },
        });
    }

    async findAll(estado?: boolean) {
        const where: any = {};
        if (estado !== undefined) where.estado = estado;
        return this.prisma.scoped.modulos.findMany({
            where,
            orderBy: [{ id_categoria: 'asc' }, { orden: 'asc' }],
            include: { categorias: true },
        });
    }

    async findByCategoria(idCategoria: number) {
        return this.prisma.scoped.modulos.findMany({
            where: { id_categoria: BigInt(idCategoria), estado: true },
            orderBy: { orden: 'asc' },
        });
    }

    async findOne(id: number) {
        const modulo = await this.prisma.scoped.modulos.findUnique({
            where: { id_modulo: BigInt(id) },
            include: { categorias: true },
        });
        if (!modulo) throw new NotFoundException(`Módulo con ID ${id} no encontrado`);
        return modulo;
    }

    async update(id: number, dto: UpdateModuloDto) {
        try {
            return await this.prisma.scoped.modulos.update({
                where: { id_modulo: BigInt(id) },
                data: {
                    nombre: dto.nombre,
                    ruta: dto.ruta,
                    id_categoria: dto.id_categoria ? BigInt(dto.id_categoria) : undefined,
                    orden: dto.orden,
                    estado: dto.estado,
                },
                include: { categorias: true },
            });
        } catch (error: any) {
            if (error.code === 'P2025') throw new NotFoundException(`Módulo con ID ${id} no encontrado`);
            throw error;
        }
    }

    async changeState(id: number, estado: boolean) {
        return this.update(id, { estado });
    }

    async remove(id: number) {
        try {
            await this.prisma.scoped.modulos.delete({
                where: { id_modulo: BigInt(id) },
            });
            return { message: 'Módulo eliminado' };
        } catch (error: any) {
            if (error.code === 'P2025') throw new NotFoundException(`Módulo con ID ${id} no encontrado`);
            throw error;
        }
    }
}
