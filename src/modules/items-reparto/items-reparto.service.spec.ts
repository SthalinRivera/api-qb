import { ItemsRepartoService } from './items-reparto.service';
describe('Asignación concurrente', () => {
  it('relee el total después de adquirir el bloqueo de operación', async () => {
    const tx: any = { $queryRaw: jest.fn(), detalle_carga: {
      findUnique: jest.fn(async () => ({ id_operacion: 1n, cantidad_jabas: 20 })),
      findUniqueOrThrow: jest.fn(async () => ({ id_operacion: 1n, cantidad_jabas: 10, es_reparto: false })),
    }, operaciones_carga: { findUniqueOrThrow: jest.fn(async () => ({ estado: 'en_transito' })) },
    items_reparto: { aggregate: jest.fn(async () => ({ _sum: { cantidad_asignada: 0 } })), create: jest.fn() } };
    const prisma: any = { empresaId: 1n, scoped: { $transaction: async fn => fn(tx) } };
    const service = new ItemsRepartoService(prisma);
    await expect(service.create({ id_detalle_carga: 1, id_cliente_receptor: 2, id_puesto: 3, cantidad_asignada: 15 })).rejects.toThrow('saldo');
    expect(tx.detalle_carga.findUniqueOrThrow).toHaveBeenCalled();
    expect(tx.items_reparto.create).not.toHaveBeenCalled();
  });
});
