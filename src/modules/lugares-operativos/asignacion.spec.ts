import { requestContext, Actor } from '../../common/security/request-context';
import { LugaresOperativosService } from './lugares-operativos.service';
const actor: Actor = { empresaId: 7n, usuarioId: 1n, roles: ['administrador'], administrador: true, repartidor: false };
function setup(estado = true) {
  const db: any = {
    empresaId: 7n,
    lugares_operativos: {
      findUnique: jest.fn().mockResolvedValue({ id_lugar: 9n, estado }),
      findMany: jest.fn().mockResolvedValue([{ id_lugar: 9n, estado: true, empresa_lugares: [{ estado: true }] }]),
      update: jest.fn(),
    },
    empresa_lugares: { upsert: jest.fn() },
  };
  db.$transaction = (fn: any) => fn(db);
  return { db, service: new LugaresOperativosService(db) };
}
describe('Asignación administrativa de lugares', () => {
  it.each([true, false])('guarda estado %s exclusivamente para la empresa autenticada', async estado => {
    const { db, service } = setup();
    await requestContext.run(actor, () => service.asignar(9, estado));
    expect(db.empresa_lugares.upsert).toHaveBeenCalledWith({
      where: { id_empresa_id_lugar: { id_empresa: 7n, id_lugar: 9n } },
      create: { id_empresa: 7n, id_lugar: 9n, estado }, update: { estado },
    });
    expect(db.lugares_operativos.update).not.toHaveBeenCalled();
  });
  it('deniega escritura y catálogo a usuarios no administradores', async () => {
    const { db, service } = setup();
    await requestContext.run({ ...actor, administrador: false }, async () => {
      await expect(service.asignar(9, true)).rejects.toMatchObject({ status: 403 });
      await expect(service.catalogo('150507')).rejects.toMatchObject({ status: 403 });
    });
    expect(db.empresa_lugares.upsert).not.toHaveBeenCalled();
    expect(db.lugares_operativos.findMany).not.toHaveBeenCalled();
  });
  it('rechaza asignar un lugar inactivo', async () => {
    const { db, service } = setup(false);
    await requestContext.run(actor, () => expect(service.asignar(9, true)).rejects.toMatchObject({ status: 404 }));
    expect(db.empresa_lugares.upsert).not.toHaveBeenCalled();
  });
  it('rechaza asignar un lugar inexistente', async () => {
    const { db, service } = setup(); db.lugares_operativos.findUnique.mockResolvedValue(null);
    await requestContext.run(actor, () => expect(service.asignar(9, true)).rejects.toMatchObject({ status: 404 }));
    expect(db.empresa_lugares.upsert).not.toHaveBeenCalled();
  });
  it('consulta el catálogo global sin exponer vínculos de otras empresas', async () => {
    const { db, service } = setup();
    const result = await requestContext.run(actor, () => service.catalogo('150507'));
    expect(db.lugares_operativos.findMany).toHaveBeenCalledWith({
      where: { id_ubigeo: '150507', estado: true },
      include: { distritos: true, empresa_lugares: { where: { id_empresa: 7n } } }, orderBy: { nombre: 'asc' },
    });
    expect(result[0]).not.toHaveProperty('empresa_lugares');
  });
});
