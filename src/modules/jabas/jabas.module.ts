import { Module } from '@nestjs/common';
import { JabasService } from './jabas.service';
import { JabasController } from './jabas.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [JabasController],
  providers: [JabasService],
})
export class JabasModule { }
