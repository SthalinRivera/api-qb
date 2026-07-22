import { Module } from '@nestjs/common';
import { RolesModulosService } from './roles-modulos.service';
import { RolesModulosController } from './roles-modulos.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [RolesModulosController],
    providers: [RolesModulosService],
    exports: [RolesModulosService],
})
export class RolesModulosModule {}
