import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {

    constructor(private prisma: PrismaService) { }

    // Helper para convertir bigint a number
    private transformBigInt(obj: any): any {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'bigint') return Number(obj);
        if (Array.isArray(obj)) return obj.map(item => this.transformBigInt(item));
        if (typeof obj === 'object') {
            const newObj: any = {};
            for (const key in obj) {
                newObj[key] = this.transformBigInt(obj[key]);
            }
            return newObj;
        }
        return obj;
    }

    // GET ALL
    async findAll() {
        const users = await this.prisma.usuarios.findMany();
        return this.transformBigInt(users);
    }

    // GET BY ID
    async findOne(id: number) {
        const user = await this.prisma.usuarios.findUnique({
            where: { id_usuario: BigInt(id) },
        });
        return this.transformBigInt(user);
    }

    // CREATE
    async create(data: any) {
        const newUser = await this.prisma.usuarios.create({ data });
        return this.transformBigInt(newUser);
    }

    // UPDATE
    async update(id: number, data: any) {
        const updated = await this.prisma.usuarios.update({
            where: { id_usuario: BigInt(id) },
            data,
        });
        return this.transformBigInt(updated);
    }

    // DELETE
    async remove(id: number) {
        const deleted = await this.prisma.usuarios.delete({
            where: { id_usuario: BigInt(id) },
        });
        return this.transformBigInt(deleted);
    }
}