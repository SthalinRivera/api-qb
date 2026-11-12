import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';
const transactionContext = new AsyncLocalStorage<any>();
import { actorActual } from '../../common/security/request-context';
import { prepararConsulta } from '../../common/security/tenant-query';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';   // 👈 necesario

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly baseClient: PrismaClient;

    constructor() {
        // 1. Crear el pool de conexiones usando la URL
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        // 2. Crear el adaptador con el pool
        const adapter = new PrismaPg(pool);
        // 3. Pasar el adaptador al cliente
        super({ adapter });
        // Keep the public Prisma proxy: getters run with the internal instance,
        // which does not expose model delegates such as usuarios.findFirst.
        this.baseClient = this;
    }

    get empresaId() { return actorActual().empresaId; }
    private scopedClient?: PrismaClient;
    get scoped(): PrismaClient {
        actorActual();
        if (!this.scopedClient) {
            const base = this.baseClient;
            const extended = this.$extends({ query: { $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    await prepararConsulta(model, operation, args, actorActual(), transactionContext.getStore() || base);
                    return query(args);
                },
            } } }) as unknown as PrismaClient;
            this.scopedClient = new Proxy(extended, {
                get(target, key) {
                    if (key === '$transaction') return (callback: any, options?: any) => {
                        if (typeof callback !== 'function') return target.$transaction(callback, options);
                        return target.$transaction((tx) => transactionContext.run(tx, () => callback(tx)), options);
                    };
                    return Reflect.get(target, key);
                },
            });
        }
        return this.scopedClient;
    }

    async onModuleInit() {
        await this.$connect();
    }
}
