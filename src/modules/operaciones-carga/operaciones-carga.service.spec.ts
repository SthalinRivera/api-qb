import { describe, it, expect, jest } from '@jest/globals';
import { OperacionesCargaService } from './operaciones-carga.service';

describe('Confirmar carga', () => {
  const setup = (estado: string, detalles: unknown[]) => {
    const prisma: any = {
      $transaction: async (callback: any) => callback(prisma),
      $queryRaw: jest.fn(),
      operaciones_carga: {
        findUnique: jest.fn(async () => ({ estado, detalle_carga: detalles })),
        update: jest.fn(async () => ({ estado: 'repartiendo' })),
      },
    };
    return { prisma, service: new OperacionesCargaService(prisma, {} as any) };
  };
  const directa = () => ({
    id_detalle_carga: 1,
    cantidad_jabas: 10,
    es_reparto: false,
    detalle_carga_calidades: [],
    items_reparto: [
      { cantidad_asignada: 10, id_cliente_receptor: 2, entregas: [] },
    ],
  });
  it('confirma entrega directa sin calidades', async () => {
    const { service, prisma } = setup('en_curso', [directa()]);
    await expect(service.finalizar(1)).resolves.toEqual({
      estado: 'repartiendo',
    });
    expect(prisma.operaciones_carga.update).toHaveBeenCalledTimes(1);
  });
  it('rechaza reparto sin clasificar aunque tenga destinos', async () => {
    const { service, prisma } = setup('en_curso', [
      { ...directa(), es_reparto: true },
    ]);
    await expect(service.finalizar(1)).rejects.toThrow('clasifica');
    expect(prisma.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it('rechaza cargas sin destino', async () => {
    const { service } = setup('en_curso', [
      { ...directa(), items_reparto: [] },
    ]);
    await expect(service.finalizar(1)).rejects.toThrow('receptor');
  });
  it.each(['repartiendo', 'completado', 'cancelado'])(
    'no vuelve a confirmar %s',
    async (estado) => {
      const { service } = setup(estado, [directa()]);
      await expect(service.finalizar(1)).rejects.toThrow(
        'confirmada o está cancelada',
      );
    },
  );
});
