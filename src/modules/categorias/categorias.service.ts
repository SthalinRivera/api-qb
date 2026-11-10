import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { ReorderCategoriasDto } from './dto/reorder-categorias.dto';

@Injectable()
export class CategoriasService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateCategoriaDto) {
        return this.prisma.scoped.categorias.create({
            data: {
                nombre: dto.nombre,
                descripcion: dto.descripcion,
                icono_web: dto.icono_web,
                icono_mobil: dto.icono_mobil,
                orden: dto.orden ?? 0,
                estado: dto.estado ?? true,
            },
        });
    }

    async findAll(estado?: boolean) {
        const where: any = {};
        if (estado !== undefined) where.estado = estado;
        return this.prisma.scoped.categorias.findMany({
            where,
            orderBy: { orden: 'asc' },
            include: { modulos: { orderBy: { orden: 'asc' } } },
        });
    }

    async findOne(id: number) {
        const cat = await this.prisma.scoped.categorias.findUnique({
            where: { id_categoria: BigInt(id) },
            include: { modulos: { orderBy: { orden: 'asc' } } },
        });
        if (!cat) throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
        return cat;
    }

    async update(id: number, dto: UpdateCategoriaDto) {
        try {
            return await this.prisma.scoped.categorias.update({
                where: { id_categoria: BigInt(id) },
                data: {
                    nombre: dto.nombre,
                    descripcion: dto.descripcion,
                    icono_web: dto.icono_web,
                    icono_mobil: dto.icono_mobil,
                    orden: dto.orden,
                    estado: dto.estado,
                },
            });
        } catch (error: any) {
            if (error.code === 'P2025') throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
            throw error;
        }
    }

    async changeState(id: number, estado: boolean) {
        return this.update(id, { estado });
    }

    async reorder(dto: ReorderCategoriasDto) {
        const operations = dto.items.map((item) =>
            this.prisma.scoped.categorias.update({
                where: { id_categoria: BigInt(item.id_categoria) },
                data: { orden: item.orden },
            }),
        );
        await this.prisma.scoped.$transaction(operations);
        return this.findAll();
    }

    async remove(id: number) {
        try {
            await this.prisma.scoped.categorias.delete({
                where: { id_categoria: BigInt(id) },
            });
            return { message: 'Categoría eliminada' };
        } catch (error: any) {
            if (error.code === 'P2025') throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
            throw error;
        }
    }
}
