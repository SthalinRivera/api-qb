import { Module } from '@nestjs/common';
import { GuiasOperativasService } from './guias-operativas.service';
import { GuiasOperativasController } from './guias-operativas.controller';

@Module({
  controllers: [GuiasOperativasController],
  providers: [GuiasOperativasService],
  exports: [GuiasOperativasService],
})
export class GuiasOperativasModule { }
