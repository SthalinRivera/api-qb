import { DetalleCargaService } from './detalle-carga.service';
function setup(es_reparto = false) {
  const calidad = { id_detalle_carga_calidad: 11n, id_detalle_carga: 1n, id_calidad: 4n, cantidad: 40, precio_unitario: 2 };
  const item = { id_item_reparto: 9n, entregas: [], guias_operativas: [], resoluciones_reparto: [] };
  const detalle = { id_detalle_carga: 1n, id_operacion: 3n, id_empresa: 7n, es_reparto, cantidad_jabas: 100, detalle_carga_calidades: [calidad], items_reparto: [item], operaciones_carga: { estado: 'en_curso' } };
  const db: any = {
    empresaId: 7n, $queryRaw: jest.fn(),
    detalle_carga: { findUnique: jest.fn().mockResolvedValue(detalle), findUniqueOrThrow: jest.fn().mockResolvedValue(detalle), findMany: jest.fn().mockResolvedValue([{ id_detalle_carga: 1n, orden_carga: 1 }, { id_detalle_carga: 2n, orden_carga: 2 }]), update: jest.fn() },
    operaciones_carga: { findUnique: jest.fn().mockResolvedValue({ estado: 'en_curso' }) },
    calidades: { findUnique: jest.fn().mockResolvedValue({ estado: true }), findFirst: jest.fn().mockResolvedValue({ estado: true }) },
    detalle_carga_calidades: { findUnique: jest.fn().mockResolvedValue(calidad), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(({ data }) => Promise.resolve({ ...data, id_detalle_carga_calidad: 12n })), update: jest.fn(({ data }) => Promise.resolve({ ...calidad, ...data })), delete: jest.fn() },
    items_reparto: { findMany: jest.fn().mockResolvedValue([item]) },
    items_reparto_detalle: { create: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([{ cantidad: 40, items_reparto: item }]) },
  };
  db.scoped = db; db.$transaction = (fn: any) => fn(db);
  return { db, detalle, item, service: new DetalleCargaService(db) };
}
describe('Calidades independientes de puestos', () => {
  it('registra una calidad directa y asigna sus jabas al único destino en la misma transacción', async () => {
    const { db, service } = setup();
    await service.addCalidad(1, { id_calidad: 5, cantidad: 60, precio_unitario: 3 });
    expect(db.items_reparto_detalle.create).toHaveBeenCalledWith({ data: { id_empresa: 7n, id_item_reparto: 9n, id_detalle_carga_calidad: 12n, cantidad: 60, precio_unitario: 3 } });
  });
  it('en reparto registra calidad sin elegir un destino todavía', async () => {
    const { db, service } = setup(true);
    await service.addCalidad(1, { id_calidad: 5, cantidad: 60 });
    expect(db.items_reparto_detalle.create).not.toHaveBeenCalled();
  });
  it('ajusta automáticamente cantidad y precio en la asignación directa', async () => {
    const { db, service } = setup();
    await service.updateCalidad(11, { cantidad: 20, precio_unitario: 5 });
    expect(db.items_reparto_detalle.create).toHaveBeenCalledWith({ data: { id_empresa: 7n, id_item_reparto: 9n, id_detalle_carga_calidad: 11n, cantidad: 20, precio_unitario: 5 } });
  });
  it('retira la asignación de calidad directa al eliminarla', async () => {
    const { db, service } = setup();
    await service.removeCalidad(11);
    expect(db.items_reparto_detalle.deleteMany).toHaveBeenCalledWith({ where: { id_detalle_carga_calidad: 11 } });
    expect(db.detalle_carga_calidades.delete).toHaveBeenCalled();
  });
  it('no reduce una calidad de reparto por debajo de lo ya asignado', async () => {
    const { db, service } = setup(true);
    await expect(service.updateCalidad(11, { cantidad: 20 })).rejects.toThrow('Reajusta primero');
    expect(db.detalle_carga_calidades.update).not.toHaveBeenCalled();
  });
  it.each(['add', 'update', 'remove'])('protege la calidad directa con guía vigente al %s', async action => {
    const { db, item, service } = setup();
    (item.guias_operativas as any[]).push({ estado: 'emitida' });
    const request = action === 'add' ? service.addCalidad(1, { id_calidad: 5, cantidad: 60 }) : action === 'update' ? service.updateCalidad(11, { cantidad: 20 }) : service.removeCalidad(11);
    await expect(request).rejects.toThrow('guía vigente');
    expect(db.items_reparto_detalle.deleteMany).not.toHaveBeenCalled();
    expect(db.detalle_carga_calidades.create).not.toHaveBeenCalled();
  });
  it('rechaza exceder la carga sin guardar ni asignar', async () => {
    const { db, service } = setup();
    await expect(service.addCalidad(1, { id_calidad: 5, cantidad: 61 })).rejects.toThrow('excede');
    expect(db.detalle_carga_calidades.create).not.toHaveBeenCalled();
  });
  it('no elige arbitrariamente entre varios destinos de una carga directa', async () => {
    const { db, service } = setup(); db.items_reparto.findMany.mockResolvedValue([{}, {}]);
    await expect(service.addCalidad(1, { id_calidad: 5, cantidad: 60 })).rejects.toThrow('único destino');
    expect(db.detalle_carga_calidades.create).not.toHaveBeenCalled();
  });
});
describe('Orden atómico de carga', () => {
  it('intercambia productos sin colisión de posiciones', async () => {
    const { db, service } = setup();
    await service.reordenar(3, [2, 1]);
    expect(db.detalle_carga.update.mock.calls.map(([arg]) => [arg.where.id_detalle_carga, arg.data.orden_carga])).toEqual([[2, 3], [1, 4], [2, 1], [1, 2]]);
  });
  it.each([[1], [1, 1], [1, 99]])('rechaza lista incompleta, duplicada o de otra operación: %j', async (...ids) => {
    const { db, service } = setup();
    await expect(service.reordenar(3, ids as number[])).rejects.toThrow('todos los productos');
    expect(db.detalle_carga.update).not.toHaveBeenCalled();
  });
  it('rechaza reordenar fuera de preparación', async () => {
    const { db, service } = setup(); db.operaciones_carga.findUnique.mockResolvedValue({ estado: 'en_transito' });
    await expect(service.reordenar(3, [2, 1])).rejects.toThrow('preparación');
    expect(db.detalle_carga.update).not.toHaveBeenCalled();
  });
});
