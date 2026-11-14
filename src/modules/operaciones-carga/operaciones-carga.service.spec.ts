import { describe, it, expect, jest } from '@jest/globals';
import { OperacionesCargaService } from './operaciones-carga.service';

describe('Confirmar carga', () => {
  const setup = (estado: string, detalles: unknown[]) => {
    const prisma: any = {
      $transaction: async (callback: any) => callback(prisma),
      $queryRaw: jest.fn(),
      operaciones_carga: {
        findUnique: jest.fn(async () => ({ estado, detalle_carga: detalles })),
        update: jest.fn(async () => ({ estado: 'en_transito' })),
      },
    };
    prisma.scoped = prisma; prisma.empresaId = 1n;
    return { prisma, service: new OperacionesCargaService(prisma, {} as any) };
  };
  const directa = () => ({
    id_detalle_carga: 1,
    cantidad_jabas: 10,
    es_reparto: false,
    detalle_carga_calidades: [],
    items_reparto: [
      { cantidad_asignada: 10, id_cliente_receptor: 2, id_puesto: 3, entregas: [] },
    ],
  });
  it('confirma entrega directa sin calidades', async () => {
    const { service, prisma } = setup('en_curso', [directa()]);
    await expect(service.finalizar(1)).resolves.toEqual({
      estado: 'en_transito',
    });
    expect(prisma.operaciones_carga.update).toHaveBeenCalledTimes(1);
  });
  it('rechaza reparto sin clasificar aunque tenga destinos', async () => {
    const { service, prisma } = setup('en_curso', [
      { ...directa(), es_reparto: true },
    ]);
    await expect(service.finalizar(1)).rejects.toThrow('Completa las calidades');
    expect(prisma.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it('termina la preparación sin exigir destinos del proceso de entrega', async () => {
    const { service } = setup('en_curso', [
      { ...directa(), items_reparto: [] },
    ]);
    await expect(service.finalizar(1)).resolves.toEqual({ estado: 'en_transito' });
  });
  it('termina una carga clasificada aún sin receptores', async () => {
    const { service } = setup('en_curso', [{ ...directa(), es_reparto: true, detalle_carga_calidades: [{ cantidad: 10 }], items_reparto: [] }]);
    await expect(service.finalizar(1)).resolves.toEqual({ estado: 'en_transito' });
  });
  it.each([
    { detalles: [] },
    { detalles: [{ ...directa(), cantidad_jabas: 0 }] },
    { detalles: [{ ...directa(), es_reparto: true, detalle_carga_calidades: [{ cantidad: 11 }] }] },
  ])('rechaza una preparación vacía o con cantidades inválidas (%#)', async ({ detalles }) => {
    const { service, prisma } = setup('en_curso', detalles);
    await expect(service.finalizar(1)).rejects.toThrow('Completa las calidades');
    expect(prisma.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it('permite terminar una carga pendiente completa', async () => {
    const { service } = setup('pendiente', [directa()]);
    await expect(service.finalizar(1)).resolves.toEqual({ estado: 'en_transito' });
  });
  it('no vuelve a escribir el estado al reintentar una carga en tránsito', async () => {
    const { service, prisma } = setup('en_transito', [directa()]);
    await expect(service.finalizar(1)).resolves.toMatchObject({ estado: 'en_transito' });
    expect(prisma.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it.each(['repartiendo', 'completado', 'cancelado'])(
    'no vuelve a confirmar %s',
    async (estado) => {
      const { service } = setup(estado, [directa()]);
      await expect(service.finalizar(1)).rejects.toThrow(
        'Transición',
      );
    },
  );
});
