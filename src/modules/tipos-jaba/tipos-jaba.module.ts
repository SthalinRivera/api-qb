import { Module } from '@nestjs/common';
import { TiposJabaService } from './tipos-jaba.service';
import { TiposJabaController } from './tipos-jaba.controller';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TiposJabaController],
  providers: [TiposJabaService],
  exports: [TiposJabaService],
})
export class TiposJabaModule { }
