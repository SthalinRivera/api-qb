import {
  Controller,
  Get,
  Post,
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
// import { JwtAuthGuard } from '...' // si usas guard

@Controller('jabas')
// @UseGuards(JwtAuthGuard) // opcional
export class JabasController {
  constructor(private readonly jabasService: JabasService) { }

  // ==================== JABAS POR PAGAR ====================

  @Get('por-pagar')
  listarPorPagar(@Query() query: QueryParamsDto, @Req() req: any) {
    // Reemplaza 1 con req.user.id_empresa
    return this.jabasService.listarJabasPorPagar(query, 1);
  }

  @Get('por-pagar/:id')
  obtenerPorPagar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.jabasService.obtenerJabaPagar(id, 1);
  }

  // ==================== JABAS POR COBRAR ====================

  @Get('por-cobrar')
  listarPorCobrar(@Query() query: QueryParamsDto, @Req() req: any) {
    return this.jabasService.listarJabasPorCobrar(query, 1);
  }

  @Get('por-cobrar/:id')
  obtenerPorCobrar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.jabasService.obtenerJabaCobrar(id, 1);
  }

  // ==================== RECUPERACIONES ====================

  @Post('recuperaciones')
  registrarRecuperacion(
    @Body() dto: CreateRecuperacionDto,
    @Req() req: any,
  ) {
    // Reemplaza req.user.id con el ID real del usuario
    return this.jabasService.registrarRecuperacion(dto, 1, req.user?.id);
  }

  @Get('recuperaciones/:idJabaCobrar')
  listarRecuperaciones(
    @Param('idJabaCobrar', ParseIntPipe) idJabaCobrar: number,
    @Req() req: any,
  ) {
    return this.jabasService.listarRecuperacionesPorJabaCobrar(idJabaCobrar, 1);
  }

  // ==================== DEVOLUCIONES A EMISOR ====================

  @Post('devoluciones-emisor')
  registrarDevolucionEmisor(
    @Body() dto: CreateDevolucionEmisorDto,
    @Req() req: any,
  ) {
    return this.jabasService.registrarDevolucionEmisor(dto, 1, req.user?.id);
  }

  @Get('devoluciones-emisor/:idJabaPagar')
  listarDevoluciones(
    @Param('idJabaPagar', ParseIntPipe) idJabaPagar: number,
    @Req() req: any,
  ) {
    return this.jabasService.listarDevolucionesPorJabaPagar(idJabaPagar, 1);
  }
}