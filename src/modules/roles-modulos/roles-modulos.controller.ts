import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesModulosService } from './roles-modulos.service';
import { AssignModulosDto } from './dto/roles-modulo.dto';

@ApiTags('Roles - Módulos')
@Controller('roles-modulos')
export class RolesModulosController {
    constructor(private readonly rolesModulosService: RolesModulosService) {}

    @Post('assign')
    @ApiOperation({ summary: 'Asignar módulos a un rol (reemplaza asignaciones actuales)' })
    assignModulos(@Body() dto: AssignModulosDto) {
        return this.rolesModulosService.assignModulos(dto);
    }

    @Post('toggle/:rolId/:moduloId')
    @ApiOperation({ summary: 'Toggle módulo en un rol (agregar/quitar)' })
    toggleModulo(
        @Param('rolId', ParseIntPipe) rolId: number,
        @Param('moduloId', ParseIntPipe) moduloId: number,
        @Body('usuario_asigno') usuarioAsigno?: number,
    ) {
        return this.rolesModulosService.toggleModulo(rolId, moduloId, usuarioAsigno);
    }

    @Get('rol/:rolId')
    @ApiOperation({ summary: 'Obtener módulos asignados a un rol' })
    getModulosByRol(@Param('rolId', ParseIntPipe) rolId: number) {
        return this.rolesModulosService.getModulosByRol(rolId);
    }

    @Get('modulo/:moduloId')
    @ApiOperation({ summary: 'Obtener roles que tienen un módulo asignado' })
    getRolesByModulo(@Param('moduloId', ParseIntPipe) moduloId: number) {
        return this.rolesModulosService.getRolesByModulo(moduloId);
    }

    @Get('usuario/:usuarioId')
    @ApiOperation({ summary: 'Obtener módulos permitidos para un usuario (según sus roles)' })
    getModulosPermitidosByUsuario(@Param('usuarioId', ParseIntPipe) usuarioId: number) {
        return this.rolesModulosService.getModulosPermitidosByUsuario(usuarioId);
    }
}
