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
import { SedesModule } from './modules/sedes/sedes.module';
import { CamionesModule } from './modules/camiones/camiones.module';
import { MercadosModule } from './modules/lugares-operativos/mercados.module';

import { PuestosModule } from './modules/puestos/puestos.module';
import { OperacionesCargaModule } from './modules/operaciones-carga/operaciones-carga.module';
import { DetalleCargaModule } from './modules/detalle-carga/detalle-carga.module';
import { ItemsRepartoModule } from './modules/items-reparto/items-reparto.module';
import { GuiasOperativasModule } from './modules/guias-operativas/guias-operativas.module';
import { EntregasModule } from './modules/entregas/entregas.module';
@Module({
  imports: [AuthModule, EmpresasModule, UsuariosModule, RolesUsuariosModule, ClientesModule, FrutasModule, VariedadesModule, CalidadesModule, TiposJabaModule, SedesModule, CamionesModule, MercadosModule, PuestosModule, OperacionesCargaModule, DetalleCargaModule, ItemsRepartoModule, GuiasOperativasModule, EntregasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
