import { describe, expect, it, jest } from '@jest/globals';
import { ModulosService } from './modulos.service';

describe('Reordenamiento de módulos', () => {
  it('guarda el orden en una transacción y devuelve los módulos actualizados', async () => {
    const updatedModules = [
      { id_modulo: 2n, orden: 0 },
      { id_modulo: 1n, orden: 1 },
    ];
    const modulos = {
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue(updatedModules),
    };
    const prisma = {
      scoped: {
        modulos,
        $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
          Promise.all(operations),
        ),
      },
    };
    const service = new ModulosService(prisma as never);

    await expect(
      service.reorder({
        items: [
          { id_modulo: 2, orden: 0 },
          { id_modulo: 1, orden: 1 },
        ],
      }),
    ).resolves.toEqual(updatedModules);

    expect(modulos.update).toHaveBeenNthCalledWith(1, {
      where: { id_modulo: 2n },
      data: { orden: 0 },
    });
    expect(modulos.update).toHaveBeenNthCalledWith(2, {
      where: { id_modulo: 1n },
      data: { orden: 1 },
    });
    expect(prisma.scoped.$transaction).toHaveBeenCalledTimes(1);
    expect(modulos.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ id_categoria: 'asc' }, { orden: 'asc' }],
      include: { categorias: true },
    });
  });
});
