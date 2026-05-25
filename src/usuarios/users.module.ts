import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';   // 👈 importa el módulo de Prisma

@Module({
  imports: [PrismaModule],   // 👈 para que PrismaService esté disponible
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule { }