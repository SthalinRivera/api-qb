import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../config/prisma/prisma.service';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector, {} as PrismaService);
  const context = (actor?: { roles: string[]; administrador: boolean }) => ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ actor }) }),
  }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(['admin', 'administrador', 'superadmin', 'super_admin'])('acepta el perfil administrativo validado: %s', async role => {
    await expect(guard.canActivate(context({ roles: [role], administrador: true }))).resolves.toBe(true);
  });
  it('rechaza usuarios sin permisos administrativos', async () => {
    await expect(guard.canActivate(context({ roles: ['repartidor'], administrador: false }))).rejects.toThrow(ForbiddenException);
  });
  it('rechaza peticiones sin perfil autenticado', async () => {
    await expect(guard.canActivate(context())).rejects.toThrow(ForbiddenException);
  });
  it('no sustituye otros roles específicos por el perfil administrativo', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['auditor']);
    await expect(guard.canActivate(context({ roles: ['administrador'], administrador: true }))).rejects.toThrow(ForbiddenException);
  });
});
