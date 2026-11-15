import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { OperacionesCargaService } from './operaciones-carga.service';
import { CreateOperacionCargaDto } from './dto/create-operaciones-carga.dto';
import { UpdateOperacionCargaDto } from './dto/update-operaciones-carga.dto';

const mensaje = 'El distrito de origen y el distrito de destino deben ser diferentes.';
const datos = { id_ubigeo_origen: '150507', id_ubigeo_destino: '150115', id_camion: 1, fecha_carga: '2026-11-15' };
function setup(estado = 'pendiente', overrides = {}) {
  const db: any = {
    empresaId: 7n,
    $queryRaw: jest.fn().mockResolvedValue([{ id_ubigeo: '150115' }]),
    distritos: { findUnique: jest.fn(({ where }) => Promise.resolve({ ...where, nombre: 'Mismo nombre' })) },
    clientes: { findFirst: jest.fn().mockResolvedValue({ id_cliente: 1 }) },
    camiones: { findFirst: jest.fn().mockResolvedValue({ id_camion: 1 }) },
    detalle_carga: { count: jest.fn().mockResolvedValue(0) },
    items_reparto: { findMany: jest.fn().mockResolvedValue([]) },
    operaciones_carga: {
      findUnique: jest.fn().mockResolvedValue({ ...datos, estado, ...overrides }),
      create: jest.fn(({ data }) => Promise.resolve(data)),
      update: jest.fn(({ data }) => Promise.resolve(data)),
    },
  };
  db.scoped = db;
  db.$transaction = (fn: any) => fn(db);
  return { db, service: new OperacionesCargaService(db, {} as any) };
}
describe('Territorio de operaciones', () => {
  it('crea con UBIGEO diferentes incluso si los nombres coinciden', async () => {
    const { service, db } = setup();
    await expect(service.create(datos)).resolves.toMatchObject({ ...datos, fecha_carga: new Date(datos.fecha_carga) });
    expect(db.distritos.findUnique).toHaveBeenCalledTimes(2);
    expect(db.operaciones_carga.create).toHaveBeenCalledTimes(1);
  });
  it('rechaza creación con UBIGEO iguales mediante HTTP 400 sin escribir', async () => {
    const { service, db } = setup();
    await expect(service.create({ ...datos, id_ubigeo_destino: datos.id_ubigeo_origen })).rejects.toMatchObject({ status: 400, message: mensaje });
    expect(db.operaciones_carga.create).not.toHaveBeenCalled();
  });
  it.each(['id_ubigeo_origen', 'id_ubigeo_destino'])('rechaza distrito inexistente en %s', async campo => {
    const { service, db } = setup();
    db.distritos.findUnique.mockImplementation(({ where }: any) => Promise.resolve(where.id_ubigeo === datos[campo] ? null : where));
    await expect(service.create(datos)).rejects.toThrow('no existe');
    expect(db.operaciones_carga.create).not.toHaveBeenCalled();
  });
  it.each([
    { id_ubigeo_origen: '150115' },
    { id_ubigeo_destino: '150507' },
    { id_ubigeo_origen: '150101', id_ubigeo_destino: '150101' },
  ])('rechaza actualización igualando valores resultantes (%j)', async cambio => {
    const { service, db } = setup();
    await expect(service.update(1, { ...cambio, observaciones: 'No guardar' })).rejects.toMatchObject({ status: 400, message: mensaje });
    expect(db.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it.each(['pendiente', 'en_curso'])('actualiza parcialmente en %s', async estado => {
    const { service, db } = setup(estado);
    await service.update(1, { id_ubigeo_destino: '150101' });
    expect(db.distritos.findUnique).toHaveBeenCalledWith({ where: { id_ubigeo: '150507' }, select: { id_ubigeo: true } });
    expect(db.operaciones_carga.update).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw).toHaveBeenCalled();
  });
  it.each(['en_transito', 'repartiendo', 'completado', 'cancelado'])('impide cambiar territorio en %s', async estado => {
    const { service, db } = setup(estado);
    await expect(service.update(1, { id_ubigeo_origen: '150101' })).rejects.toThrow('fuera de preparación');
    expect(db.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it('rechaza actualización de histórico incompatible sin guardar observaciones', async () => {
    const { service, db } = setup('pendiente', { id_ubigeo_destino: '150507' });
    await expect(service.update(1, { observaciones: 'Cambio' })).rejects.toThrow(mensaje);
    expect(db.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it('rechaza distrito inexistente en actualización', async () => {
    const { service, db } = setup();
    db.distritos.findUnique.mockResolvedValue(null);
    await expect(service.update(1, { id_ubigeo_destino: '999999' })).rejects.toThrow('no existe');
    expect(db.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it.each([null, '', '15050', 150507, undefined])('rechaza origen inválido al crear: %s', async valor => {
    const { service, db } = setup();
    await expect(service.create({ ...datos, id_ubigeo_origen: valor } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.operaciones_carga.create).not.toHaveBeenCalled();
  });
});
describe('DTO territorial HTTP', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  it.each(['id_ubigeo_origen', 'id_ubigeo_destino'])('exige %s en POST', async campo => {
    const body = { ...datos }; delete body[campo];
    await expect(pipe.transform(body, { type: 'body', metatype: CreateOperacionCargaDto })).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each(['id_ubigeo_origen', 'id_ubigeo_destino'])('rechaza null explícito en PUT para %s', async campo => {
    await expect(pipe.transform({ [campo]: null }, { type: 'body', metatype: UpdateOperacionCargaDto })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('permite omitir territorio en PUT parcial', async () => {
    await expect(pipe.transform({ observaciones: 'Cambio' }, { type: 'body', metatype: UpdateOperacionCargaDto })).resolves.toMatchObject({ observaciones: 'Cambio' });
  });
});
