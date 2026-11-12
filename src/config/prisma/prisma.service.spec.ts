import { PrismaService } from './prisma.service';
import { requestContext, Actor } from '../../common/security/request-context';
import * as tenantQuery from '../../common/security/tenant-query';

describe('PrismaService scoped validation', () => {
  it('provides model delegates to relation validation without connecting to the database', async () => {
    const prisma = new PrismaService();
    const stop = new Error('Stop before database execution');
    const validate = jest.spyOn(tenantQuery, 'prepararConsulta').mockImplementation(async (_model, _operation, _args, _actor, base) => {
      expect(typeof base.usuarios.findFirst).toBe('function');
      expect(typeof base.roles_modulos.findFirst).toBe('function');
      throw stop;
    });
    const actor: Actor = { empresaId: 1n, usuarioId: 10n, roles: ['admin'], administrador: true, repartidor: false };
    try {
      await requestContext.run(actor, async () => {
        await expect(prisma.scoped.roles_modulos.createMany({
          data: [{ rol_id: 1n, modulo_id: 1n, usuario_asigno: 10n }],
        })).rejects.toThrow(stop);
      });
      expect(validate).toHaveBeenCalledTimes(1);
    } finally {
      validate.mockRestore();
      await prisma.$disconnect();
    }
  });
});
