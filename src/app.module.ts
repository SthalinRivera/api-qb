import { UbigeoController } from './modules/ubigeo/ubigeo.controller';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CompanyGuard } from './common/security/company.guard';
import { CompanyInterceptor } from './common/security/company.interceptor';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';

import { EmpresasModule } from './modules/empresas/empresas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RolesUsuariosModule } from './modules/roles-usuarios/roles-usuarios.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { FrutasModule } from './modules/frutas/frutas.module';
import { VariedadesModule } from './modules/variedades/variedades.module';
import { CalidadesModule } from './modules/calidades/calidades.module';
import { TiposJabaModule } from './modules/tipos-jaba/tipos-jaba.module';
import { CamionesModule } from './modules/camiones/camiones.module';
import { LugaresOperativosModule } from './modules/lugares-operativos/lugares-operativos.module';
import { PuestosModule } from './modules/puestos/puestos.module';
import { OperacionesCargaModule } from './modules/operaciones-carga/operaciones-carga.module';
import { DetalleCargaModule } from './modules/detalle-carga/detalle-carga.module';
import { ItemsRepartoModule } from './modules/items-reparto/items-reparto.module';
import { GuiasOperativasModule } from './modules/guias-operativas/guias-operativas.module';
import { EntregasModule } from './modules/entregas/entregas.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IncidenciasModule } from './modules/incidencias/incidencias.module';
import { JabasModule } from './modules/jabas/jabas.module';
import { EvidenciasModule } from './modules/evidencias/evidencias.module';
import { LogsActividadModule } from './modules/logs-actividad/logs-actividad.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { ModulosModule } from './modules/modulos/modulos.module';
import { RolesModulosModule } from './modules/roles-modulos/roles-modulos.module';
import { ReportesModule } from './modules/reportes/reportes.module';

@Module({
  imports: [AuthModule, EmpresasModule, UsuariosModule, RolesUsuariosModule, ClientesModule, FrutasModule, VariedadesModule, CalidadesModule, TiposJabaModule, CamionesModule, LugaresOperativosModule, PuestosModule, OperacionesCargaModule, DetalleCargaModule, ItemsRepartoModule, GuiasOperativasModule, EntregasModule, DashboardModule, IncidenciasModule, JabasModule, EvidenciasModule, LogsActividadModule, CategoriasModule, ModulosModule, RolesModulosModule, ReportesModule],
  controllers: [AppController, UbigeoController],
  providers: [AppService, SupabaseAuthGuard, { provide: APP_GUARD, useClass: CompanyGuard }, { provide: APP_INTERCEPTOR, useClass: CompanyInterceptor }],
})
export class AppModule { }
