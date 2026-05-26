import { Module } from '@nestjs/common';
import { TiposJabaService } from './tipos-jaba.service';
import { TiposJabaController } from './tipos-jaba.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TiposJabaController],
  providers: [TiposJabaService],
  exports: [TiposJabaService],
})
export class TiposJabaModule { }