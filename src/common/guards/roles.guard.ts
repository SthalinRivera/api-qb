// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return true; // No se requieren roles específicos
        }

        const request = context.switchToHttp().getRequest();
        const actor = request.actor;
        if (!actor) throw new ForbiddenException('Usuario no autenticado');
        const hasRole = requiredRoles.some(role => actor.roles.includes(role.toLowerCase()));
        if (!hasRole) throw new ForbiddenException('No tienes permiso para acceder a este recurso');

        return true;
    }
}