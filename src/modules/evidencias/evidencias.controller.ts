// src/modules/evidencias/evidencias.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EvidenciasService } from './evidencias.service';
import { SupabaseAuthGuard } from 'src/common/guards/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('evidencias')
@UseGuards(SupabaseAuthGuard)
export class EvidenciasController {
  constructor(
    private readonly evidenciasService: EvidenciasService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async findAll(@Req() req: any) {
    const profile = await this.authService.getProfile({ user: req.user });
    return this.evidenciasService.findAll(profile.id_empresa);
  }

  @Get('entity')
  findByEntity(@Query('tipo') tipo: string, @Query('id') id: string) {
    return this.evidenciasService.findByEntity(tipo, parseInt(id));
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    const profile = await this.authService.getProfile({ user: req.user });
    return this.evidenciasService.countByEntity(profile.id_empresa);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.evidenciasService.findOne(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('tipo_entidad') tipoEntidad: string,
    @Body('id_entidad') idEntidad: string,
    @Body('descripcion') descripcion: string,
    @Req() req: any,
  ) {
    const profile = await this.authService.getProfile({ user: req.user });
    return this.evidenciasService.uploadFile(
      file,
      tipoEntidad,
      parseInt(idEntidad),
      profile.id_empresa,
      profile.id,
      descripcion,
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.evidenciasService.remove(id);
  }
}
