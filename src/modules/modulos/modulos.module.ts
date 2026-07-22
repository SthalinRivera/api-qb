import { Module } from '@nestjs/common';
import { ModulosService } from './modulos.service';
import { ModulosController } from './modulos.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ModulosController],
    providers: [ModulosService],
    exports: [ModulosService],
})
export class ModulosModule {}
