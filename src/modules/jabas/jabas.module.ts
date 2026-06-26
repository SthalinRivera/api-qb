import { Module } from '@nestjs/common';
import { JabasService } from './jabas.service';
import { JabasController } from './jabas.controller';
import { PrismaModule } from '../../config/prisma/prisma.module'; // ajusta ruta

@Module({
  imports: [PrismaModule],
  controllers: [JabasController],
  providers: [JabasService],
})
export class JabasModule { }