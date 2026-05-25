import 'dotenv/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';   // 👈 necesario

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        // 1. Crear el pool de conexiones usando la URL
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        // 2. Crear el adaptador con el pool
        const adapter = new PrismaPg(pool);
        // 3. Pasar el adaptador al cliente
        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
    }
}