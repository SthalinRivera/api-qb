  import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Req,
    Delete,
    UseInterceptors,
    UploadedFiles,
    ParseIntPipe,
    UseGuards,
  } from '@nestjs/common';
  import { FilesInterceptor } from '@nestjs/platform-express';
  import { IncidenciasService } from './incidencias.service';
  import { CreateIncidenciaDto } from './dto/create-incidencia.dto';
  import { UpdateIncidenciaDto } from './dto/update-incidencia.dto';
  import { SupabaseAuthGuard } from 'src/common/guards/supabase-auth.guard';

  @Controller('incidencias')
  @UseGuards(SupabaseAuthGuard)
  export class IncidenciasController {
    constructor(private readonly incidenciasService: IncidenciasService) { }

    @Post()
    @UseInterceptors(FilesInterceptor('evidencias', 10))
    create(
      @Body() createIncidenciaDto: CreateIncidenciaDto,
      @UploadedFiles() files: Express.Multer.File[],
      @Req() req: any,
    ) {
      console.log('📥 DTO recibido (crudo):', createIncidenciaDto);
      console.log('📥 fecha_incidencia:', createIncidenciaDto.fecha_incidencia);
      console.log('📥 tipo:', typeof createIncidenciaDto.fecha_incidencia);
      const idUsuario = req.user.id_usuario;
      return this.incidenciasService.createWithEvidencias(
        createIncidenciaDto,
        files,
        idUsuario,
      );
    }

    @Get()
    findAll() {
      return this.incidenciasService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
      return this.incidenciasService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateIncidenciaDto: UpdateIncidenciaDto) {
      return this.incidenciasService.update(id, updateIncidenciaDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
      return this.incidenciasService.remove(id);
    }
  }