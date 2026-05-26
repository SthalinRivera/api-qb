import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

import { EmpresasModule } from './empresas/empresas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesUsuariosModule } from './roles-usuarios/roles-usuarios.module';
import { ClientesModule } from './clientes/clientes.module';
import { FrutasModule } from './frutas/frutas.module';
import { VariedadesModule } from './variedades/variedades.module';
import { CalidadesModule } from './calidades/calidades.module';
import { TiposJabaModule } from './tipos-jaba/tipos-jaba.module';
@Module({
  imports: [AuthModule, EmpresasModule, UsuariosModule, RolesUsuariosModule, ClientesModule, FrutasModule, VariedadesModule, CalidadesModule, TiposJabaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
