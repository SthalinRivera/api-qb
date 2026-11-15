import { ValidationPipe } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { UpdateFullClienteDto } from './dto/update-full-cliente.dto';
import { AsignarPuestoDto } from './dto/asignar-puesto.dto';
function setup(initial: any[] = []) {
  let rows = initial.map((r, i) => ({ id_cliente_puesto: BigInt(i + 1), id_empresa: 7n, id_cliente: 99n, id_puesto: 24n, estado: true, fecha_fin: null, ...r }));
  let nombre = 'Original';
  const db: any = { empresaId: 7n, $queryRaw: jest.fn(),
    clientes: { findUnique: jest.fn(async () => ({ id_cliente: 68n, id_empresa: 7n, nombres: nombre })), update: jest.fn(async ({ data }) => { nombre = data.nombres || nombre; }), create: jest.fn(async () => ({ id_cliente: 68n, id_empresa: 7n })), findFirst: jest.fn().mockResolvedValue(null) },
    puestos: { findUnique: jest.fn().mockResolvedValue({ id_puesto: 24n }) },
    empresas: { findUnique: jest.fn().mockResolvedValue({ id_empresa: 7n }) },
    distritos: { findMany: jest.fn().mockResolvedValue([{ id_ubigeo: '150507', nombre: 'Imperial' }]) },
    clientes_puestos: {
      findMany: jest.fn(async ({ where }) => rows.filter(r => r.id_cliente === BigInt(where.id_cliente) && r.estado && r.fecha_fin === null)),
      findFirst: jest.fn(async ({ where }) => rows.find(r => r.id_empresa === where.id_empresa && r.id_puesto === BigInt(where.id_puesto) && r.estado && r.fecha_fin === null && (!where.OR || where.OR.some(s => s.seccion === r.seccion))) || null),
      create: jest.fn(async ({ data }) => { const r = { ...data, id_cliente: BigInt(data.id_cliente), id_puesto: BigInt(data.id_puesto), id_cliente_puesto: BigInt(rows.length + 1), fecha_fin: null }; rows.push(r); return r; }),
      update: jest.fn(async ({ where, data }) => { const r = rows.find(r => r.id_cliente_puesto === where.id_cliente_puesto); Object.assign(r, data); return r; }),
    },
  };
  db.scoped = db;
  db.$transaction = async (fn: any) => {
    const snapshot = rows.map(r => ({ ...r })), oldName = nombre;
    try { return await fn(db); } catch (e) { rows = snapshot; nombre = oldName; throw e; }
  };
  return { db, service: new ClientesService(db), rows: () => rows, nombre: () => nombre };
}
describe('Puesto completo y secciones', () => {
  it.each([null, ''])('acepta %s como puesto completo y persiste null en PUT full', async seccion => {
    const { service, rows } = setup();
    await service.updateFull(68, { puestos: [{ id_puesto: 24, seccion }] });
    expect(rows()[0].seccion).toBeNull();
  });
  it.each([null, '', 'A'])('responde 409 ante completo ocupado para sección %s', async seccion => {
    const { service, rows, nombre } = setup([{ seccion: null }]);
    await expect(service.updateFull(68, { nombres: 'No guardar', puestos: [{ id_puesto: 24, seccion }] })).rejects.toMatchObject({ status: 409 });
    expect(rows()).toHaveLength(1); expect(nombre()).toBe('Original');
  });
  it.each(['A', 'B', 'C'])('una sección %s ocupada bloquea el puesto completo con 409', async seccion => {
    const { service } = setup([{ seccion }]);
    await expect(service.updateFull(68, { puestos: [{ id_puesto: 24, seccion: '' }] })).rejects.toMatchObject({ status: 409 });
  });
  it('permite otra sección libre y no cambia la ocupada', async () => {
    const { service, rows } = setup([{ seccion: 'A' }]);
    await service.assignPuesto(68, { id_puesto: 24, seccion: 'B' });
    expect(rows().map(r => r.seccion)).toEqual(['A', 'B']);
  });
  it('no bloquea por historial ni por una ocupación de otra empresa', async () => {
    const { service, rows } = setup([{ seccion: null, estado: false, fecha_fin: new Date() }, { seccion: null, id_empresa: 8n }]);
    await service.assignPuesto(68, { id_puesto: 24, seccion: null });
    expect(rows()).toHaveLength(3);
  });
  it('PUT conserva la misma asociación completa al reintentar', async () => {
    const { service, db } = setup([{ seccion: null, id_cliente: 68n }]);
    await service.updateFull(68, { puestos: [{ id_puesto: 24, seccion: '' }] });
    expect(db.clientes_puestos.create).not.toHaveBeenCalled();
    expect(db.clientes_puestos.update).not.toHaveBeenCalled();
  });
  it('permite sustituir las secciones propias por el puesto completo en una transacción', async () => {
    const { service, rows } = setup([{ seccion: 'A', id_cliente: 68n }]);
    await service.updateFull(68, { puestos: [{ id_puesto: 24, seccion: null }] });
    expect(rows().filter(r => r.estado).map(r => r.seccion)).toEqual([null]);
    expect(rows()[0].fecha_fin).not.toBeNull();
  });
  it('revierte bajas y datos básicos si otro cliente bloquea la sustitución', async () => {
    const { service, rows, nombre } = setup([{ seccion: 'A', id_cliente: 68n }, { seccion: 'B' }]);
    await expect(service.updateFull(68, { nombres: 'No guardar', puestos: [{ id_puesto: 24, seccion: null }] })).rejects.toMatchObject({ status: 409 });
    expect(rows().every(r => r.estado)).toBe(true); expect(nombre()).toBe('Original');
  });
  it('rechaza completo y sección juntos en la misma solicitud sin guardar parcialmente', async () => {
    const { service, rows } = setup();
    await expect(service.updateFull(68, { puestos: [{ id_puesto: 24, seccion: 'A' }, { id_puesto: 24, seccion: null }] })).rejects.toMatchObject({ status: 409 });
    expect(rows()).toHaveLength(0);
  });
  it('POST full aplica la misma exclusión', async () => {
    const { service } = setup([{ seccion: 'A' }]);
    await expect(service.createFull({ id_empresa: 7, nombres: 'Nuevo', puestos: [{ id_puesto: 24, seccion: '' }] })).rejects.toMatchObject({ status: 409 });
  });
  it('traduce la excepción del trigger de PostgreSQL a 409', async () => {
    const { service, db } = setup();
    db.clientes_puestos.create.mockRejectedValue(new Error('El puesto o la sección ya tiene una asignación vigente para esta empresa'));
    await expect(service.assignPuesto(68, { id_puesto: 24, seccion: '' })).rejects.toMatchObject({ status: 409, message: expect.stringContaining('asignación vigente') });
  });
});
describe('DTO de sección consistente', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  it.each([null, '', undefined, 'A', 'B', 'C'])('acepta contrato %s en full y asignación individual', async seccion => {
    const single = await pipe.transform({ id_puesto: 24, seccion }, { type: 'body', metatype: AsignarPuestoDto });
    const full = await pipe.transform({ puestos: [{ id_puesto: 24, seccion }] }, { type: 'body', metatype: UpdateFullClienteDto });
    expect(single.seccion).toBe(seccion === '' ? null : seccion);
    expect(full.puestos[0].seccion).toBe(single.seccion);
  });
  it.each(['D', 2, {}, false])('rechaza sección inválida %j con 400', async seccion => {
    await expect(pipe.transform({ puestos: [{ id_puesto: 24, seccion }] }, { type: 'body', metatype: UpdateFullClienteDto })).rejects.toMatchObject({ status: 400 });
  });
});
describe('Distritos de clientes sin paginación', () => {
  it('consulta distritos únicos por relación vigente y empresa autenticada sin cargar clientes', async () => {
    const { service, db } = setup();
    await expect(service.findDistritos()).resolves.toEqual({ distritos: [{ id_ubigeo: '150507', nombre: 'Imperial' }] });
    expect(db.distritos.findMany).toHaveBeenCalledWith({ where: { cliente_distrito: { some: { id_empresa: 7n, estado: true, clientes: { id_empresa: 7n } } } }, select: { id_ubigeo: true, nombre: true }, orderBy: [{ nombre: 'asc' }, { id_ubigeo: 'asc' }] });
    expect(db.clientes.findUnique).not.toHaveBeenCalled();
  });
  it('devuelve una lista vacía cuando no hay relaciones', async () => {
    const { service, db } = setup(); db.distritos.findMany.mockResolvedValue([]);
    await expect(service.findDistritos()).resolves.toEqual({ distritos: [] });
  });
});
