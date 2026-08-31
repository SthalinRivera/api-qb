import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { QueryReportesDto } from './dto/query-reportes.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('cargas-por-fecha')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de cargas por rango de fechas' })
  getCargasPorFecha(@Query() query: QueryReportesDto) {
    return this.reportesService.getCargasPorFecha(query);
  }

  @Get('detalle-carga-por-operacion')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Detalle de carga por operación' })
  getDetalleCargaPorOperacion(@Query() query: QueryReportesDto) {
    return this.reportesService.getDetalleCargaPorOperacion(query);
  }

  @Get('items-reparto-por-detalle')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Items de reparto por detalle de carga' })
  getItemsRepartoPorDetalle(@Query() query: QueryReportesDto) {
    return this.reportesService.getItemsRepartoPorDetalle(query);
  }

  @Get('guias')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de guías emitidas, firmadas y anuladas' })
  getGuiasOperativas(@Query() query: QueryReportesDto) {
    return this.reportesService.getGuiasOperativas(query);
  }

  @Get('entregas')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de entregas realizadas' })
  getEntregas(@Query() query: QueryReportesDto) {
    return this.reportesService.getEntregas(query);
  }

  @Get('incidencias')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de incidencias por tipo y estado' })
  getIncidencias(@Query() query: QueryReportesDto) {
    return this.reportesService.getIncidencias(query);
  }

  @Get('jabas-por-pagar')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de jabas por pagar (saldo pendiente por cliente)' })
  getJabasPorPagar(@Query() query: QueryReportesDto) {
    return this.reportesService.getJabasPorPagar(query);
  }

  @Get('jabas-por-cobrar')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de jabas por cobrar (saldo pendiente por entrega)' })
  getJabasPorCobrar(@Query() query: QueryReportesDto) {
    return this.reportesService.getJabasPorCobrar(query);
  }

  @Get('recuperaciones')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de recuperaciones de jabas' })
  getRecuperaciones(@Query() query: QueryReportesDto) {
    return this.reportesService.getRecuperaciones(query);
  }

  @Get('devoluciones')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de devoluciones de jabas' })
  getDevoluciones(@Query() query: QueryReportesDto) {
    return this.reportesService.getDevoluciones(query);
  }

  @Get('clientes-por-sede')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de clientes por sede' })
  getClientesPorSede(@Query() query: QueryReportesDto) {
    return this.reportesService.getClientesPorSede(query);
  }

  @Get('clientes-por-puesto')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de clientes por puesto' })
  getClientesPorPuesto(@Query() query: QueryReportesDto) {
    return this.reportesService.getClientesPorPuesto(query);
  }

  @Get('historial-asignacion-puestos')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Historial de asignación de puestos' })
  getHistorialAsignacionPuestos(@Query() query: QueryReportesDto) {
    return this.reportesService.getHistorialAsignacionPuestos(query);
  }

  @Get('inventario')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de inventario (frutas, variedades, calidades, jabas)' })
  getInventario(@Query() query: QueryReportesDto) {
    return this.reportesService.getInventario(query);
  }

  @Get('usuarios-roles')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de usuarios y roles' })
  getUsuariosRoles(@Query() query: QueryReportesDto) {
    return this.reportesService.getUsuariosRoles(query);
  }

  @Get('actividad-usuarios')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de actividad de usuarios (logs)' })
  getActividadUsuarios(@Query() query: QueryReportesDto) {
    return this.reportesService.getActividadUsuarios(query);
  }

  @Get('modulos-por-rol')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Reporte de módulos accesibles por rol' })
  getModulosPorRol(@Query() query: QueryReportesDto) {
    return this.reportesService.getModulosPorRol(query);
  }

  @Get('dashboard-graficas')
  @Roles('administrador', 'Supervisor')
  @ApiOperation({ summary: 'Datos agregados para gráficas del dashboard' })
  getDashboardGraficas(@Query() query: QueryReportesDto) {
    return this.reportesService.getDashboardGraficas(query);
  }
}
