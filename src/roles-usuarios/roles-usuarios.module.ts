// src/roles-usuarios/roles-usuarios.module.ts
import { Module } from '@nestjs/common';
import { RolesUsuariosService } from './roles-usuarios.service';
import { RolesUsuariosController } from './roles-usuarios.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RolesUsuariosController],
  providers: [RolesUsuariosService],
  exports: [RolesUsuariosService],
})
export class RolesUsuariosModule { }