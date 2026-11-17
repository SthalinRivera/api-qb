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

describe('Inicio de entrega al asignar receptor', () => {
  function setup(estado = 'en_transito', esReparto = false) {
    const operacion = { estado, id_ubigeo_destino: '150101' };
    const detalle = {
      id_detalle_carga: 1n, id_operacion: 66n, id_empresa: 1n,
      cantidad_jabas: 10, es_reparto: esReparto,
      operaciones_carga: operacion,
      detalle_carga_calidades: [{ id_detalle_carga_calidad: 7n, cantidad: 10 }],
      items_reparto: [],
    };
    const tx = {
      $queryRaw: jest.fn(),
      detalle_carga: {
        findUnique: jest.fn().mockResolvedValue(detalle),
        findUniqueOrThrow: jest.fn().mockResolvedValue(detalle),
      },
      operaciones_carga: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(operacion),
        updateMany: jest.fn(async ({ where, data }) => {
          if (operacion.estado !== where.estado) return { count: 0 };
          operacion.estado = data.estado;
          return { count: 1 };
        }),
      },
      puestos: { findFirst: jest.fn().mockResolvedValue({ id_puesto: 3n }) },
      clientes_puestos: { findFirst: jest.fn().mockResolvedValue({ id_cliente: 2n }) },
      items_reparto: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { cantidad_asignada: 0 } }),
        create: jest.fn().mockResolvedValue({ id_item_reparto: 9n }),
      },
      items_reparto_detalle: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = { empresaId: 1n, scoped: { $transaction: async fn => fn(tx) } };
    return { service: new ItemsRepartoService(prisma), tx, operacion };
  }
  const dto = { id_detalle_carga: 1, id_cliente_receptor: 2, id_puesto: 3, cantidad_asignada: 5 };

  it('inicia la entrega con una asignación directa parcial, sin registrar recepción', async () => {
    const { service, tx, operacion } = setup();
    await service.create(dto);
    expect(operacion.estado).toBe('repartiendo');
    expect(tx.operaciones_carga.updateMany).toHaveBeenCalledWith({
      where: { id_operacion: 66n, estado: 'en_transito' },
      data: { estado: 'repartiendo' },
    });
    expect(tx.items_reparto.create.mock.invocationCallOrder[0])
      .toBeLessThan(tx.operaciones_carga.updateMany.mock.invocationCallOrder[0]);
  });

  it('inicia la entrega al asignar calidades', async () => {
    const { service, tx, operacion } = setup('en_transito', true);
    await service.createMultipleFromCalidades({
      id_detalle_carga: 1,
      asignaciones: [{
        id_cliente_receptor: 2, id_puesto: 3,
        detalles: [{ id_detalle_carga_calidad: 7, cantidad: 5 }],
      }],
    });
    expect(operacion.estado).toBe('repartiendo');
    expect(tx.items_reparto_detalle.create).toHaveBeenCalledTimes(1);
  });

  it.each(['pendiente', 'en_curso', 'repartiendo'])('conserva el estado %s', async estado => {
    const { service, operacion } = setup(estado);
    await service.create(dto);
    expect(operacion.estado).toBe(estado);
  });

  it('no cambia el estado si el receptor no es válido', async () => {
    const { service, tx } = setup();
    tx.puestos.findFirst.mockResolvedValueOnce(null);
    await expect(service.create(dto)).rejects.toThrow('receptor');
    expect(tx.operaciones_carga.updateMany).not.toHaveBeenCalled();
    expect(tx.items_reparto.create).not.toHaveBeenCalled();
  });

  it('no cambia el estado si falla el guardado del destino', async () => {
    const { service, tx } = setup();
    tx.items_reparto.create.mockRejectedValueOnce(new Error('fallo de guardado'));
    await expect(service.create(dto)).rejects.toThrow('fallo de guardado');
    expect(tx.operaciones_carga.updateMany).not.toHaveBeenCalled();
  });
});