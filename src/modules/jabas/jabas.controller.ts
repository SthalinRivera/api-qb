import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JabasService } from './jabas.service';
import { CreateRecuperacionDto } from './dto/create-recuperacion.dto';
import { CreateDevolucionEmisorDto } from './dto/create-devolucion-emisor.dto';
import { QueryParamsDto } from './dto/query-params.dto';
import { SupabaseAuthGuard } from 'src/common/guards/supabase-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('jabas')
@UseGuards(SupabaseAuthGuard)
export class JabasController {
  constructor(
    private readonly jabasService: JabasService,
    private readonly authService: AuthService,
  ) { }

  private async getProfile(req: any) {
    return this.authService.getProfile({ user: req.user });
  }

  private getRoles(profile: any): string[] {
    return profile.roles?.map((r: any) => r.nombre?.toLowerCase()) || [];
  }

  // ==================== JABAS POR PAGAR ====================

  @Get('por-pagar')
  async listarPorPagar(@Query() query: QueryParamsDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    const roles = this.getRoles(profile);
    return this.jabasService.listarJabasPorPagar(query, profile.id_empresa, profile.id, roles);
  }

  @Get('por-pagar/:id')
  async obtenerPorPagar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const profile = await this.getProfile(req);
    const roles = this.getRoles(profile);
    return this.jabasService.obtenerJabaPagar(id, profile.id_empresa, profile.id, roles);
  }

  @Patch('por-pagar/:id/estado')
  async cambiarEstadoPorPagar(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: string, @Req() req: any) {
    const profile = await this.getProfile(req);
    const roles = this.getRoles(profile);
    return this.jabasService.cambiarEstadoPorPagar(id, profile.id_empresa, estado, profile.id, roles);
  }

  // ==================== JABAS POR COBRAR ====================

  @Get('por-cobrar')
  async listarPorCobrar(@Query() query: QueryParamsDto, @Req() req: any) {
    const profile = await this.getProfile(req);
    const roles = this.getRoles(profile);
    return this.jabasService.listarJabasPorCobrar(query, profile.id_empresa, profile.id, roles);
  }

  @Get('por-cobrar/:id')
  async obtenerPorCobrar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const profile = await this.getProfile(req);
    const roles = this.getRoles(profile);
    return this.jabasService.obtenerJabaCobrar(id, profile.id_empresa, profile.id, roles);
  }

  @Patch('por-cobrar/:id/estado')
  async cambiarEstadoPorCobrar(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: string, @Req() req: any) {
    const profile = await this.getProfile(req);
    const roles = this.getRoles(profile);
    return this.jabasService.cambiarEstadoPorCobrar(id, profile.id_empresa, estado, profile.id, roles);
  }

  // ==================== RECUPERACIONES ====================

  @Post('recuperaciones')
  async registrarRecuperacion(
    @Body() dto: CreateRecuperacionDto,
    @Req() req: any,
  ) {
    const profile = await this.getProfile(req);
    const roles = this.getRoles(profile);
    return this.jabasService.registrarRecuperacion(dto, profile.id_empresa, profile.id, roles);
  }

  @Get('recuperaciones/:idJabaCobrar')
  async listarRecuperaciones(
    @Param('idJabaCobrar', ParseIntPipe) idJabaCobrar: number,
    @Req() req: any,
  ) {
    const profile = await this.getProfile(req);
    return this.jabasService.listarRecuperacionesPorJabaCobrar(idJabaCobrar, profile.id_empresa);
  }

  // ==================== DEVOLUCIONES A EMISOR ====================

  @Post('devoluciones-emisor')
  async registrarDevolucionEmisor(
    @Body() dto: CreateDevolucionEmisorDto,
    @Req() req: any,
  ) {
    const profile = await this.getProfile(req);
    const roles = this.getRoles(profile);
    return this.jabasService.registrarDevolucionEmisor(dto, profile.id_empresa, profile.id, roles);
  }

  @Get('devoluciones-emisor/:idJabaPagar')
  async listarDevoluciones(
    @Param('idJabaPagar', ParseIntPipe) idJabaPagar: number,
    @Req() req: any,
  ) {
    const profile = await this.getProfile(req);
    return this.jabasService.listarDevolucionesPorJabaPagar(idJabaPagar, profile.id_empresa);
  }
}
