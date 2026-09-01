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
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IncidenciasService } from './incidencias.service';
import { CreateIncidenciaDto } from './dto/create-incidencia.dto';
import { UpdateIncidenciaDto } from './dto/update-incidencia.dto';
import { QueryIncidenciasDto } from './dto/query-incidencias.dto';
import { SupabaseAuthGuard } from 'src/common/guards/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('incidencias')
@UseGuards(SupabaseAuthGuard)
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService,
    private readonly authService: AuthService, 
  ) { }

  @Post()
  @UseInterceptors(FilesInterceptor('evidencias', 10))
  async create( // 👈 Añade 'async'
    @Body() createIncidenciaDto: CreateIncidenciaDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    // Obtén el perfil completo (incluye id_usuario)
    const profile = await this.authService.getProfile({ user: req.user });
    const idUsuario = profile.id; // Ya es number

    return this.incidenciasService.createWithEvidencias(
      createIncidenciaDto,
      files,
      idUsuario,
    );
  }

  @Get()
  findAll(@Query() query: QueryIncidenciasDto) {
    return this.incidenciasService.findAll(query);
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