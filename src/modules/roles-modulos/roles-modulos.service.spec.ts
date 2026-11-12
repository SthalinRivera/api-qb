import { PrismaService } from '../../config/prisma/prisma.service';
import { RolesModulosService } from './roles-modulos.service';

describe('RolesModulosService.assignModulos', () => {
  const setup = () => {
    const tx = {
      roles_usuarios: { findUnique: jest.fn().mockResolvedValue({ id_rol_usuario: 1n }) },
      roles_modulos: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const transaction = jest.fn(async callback => callback(tx));
    const service = new RolesModulosService({ scoped: { $transaction: transaction } } as unknown as PrismaService);
    return { service, tx, transaction };
  };

  it('replaces permissions through the same transaction', async () => {
    const { service, tx, transaction } = setup();
    await expect(service.assignModulos({ rol_id: 1, modulo_ids: [2, 3], usuario_asigno: 10 })).resolves.toMatchObject({ count: 2 });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.roles_modulos.deleteMany).toHaveBeenCalledWith({ where: { rol_id: 1n } });
    expect(tx.roles_modulos.createMany).toHaveBeenCalledWith({
      data: [
        { rol_id: 1n, modulo_id: 2n, usuario_asigno: 10n },
        { rol_id: 1n, modulo_id: 3n, usuario_asigno: 10n },
      ],
      skipDuplicates: true,
    });
  });

  it('propagates creation failures out of the transaction so Prisma rolls back deletion', async () => {
    const { service, tx, transaction } = setup();
    const error = new Error('Invalid module');
    tx.roles_modulos.createMany.mockRejectedValue(error);
    await expect(service.assignModulos({ rol_id: 1, modulo_ids: [2] })).rejects.toThrow(error);
    await expect(transaction.mock.results[0].value).rejects.toThrow(error);
  });

  it('supports clearing all permissions', async () => {
    const { service, tx } = setup();
    await expect(service.assignModulos({ rol_id: 1, modulo_ids: [] })).resolves.toMatchObject({ count: 0 });
    expect(tx.roles_modulos.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.roles_modulos.createMany).not.toHaveBeenCalled();
  });
});
