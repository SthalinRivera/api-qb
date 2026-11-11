import { prepararConsulta, alcanceModelo } from './tenant-query';
import { actorActual, requestContext, exigirSupervisor, Actor } from './request-context';
const actor: Actor = { empresaId: 7n, usuarioId: 9n, roles: ['repartidor'], repartidor: true, administrador: false };
describe('Aislamiento por empresa', () => {
  it.each(['findUnique','findMany','update','updateMany','updateManyAndReturn','delete','count','aggregate'])('limita %s aunque el filtro solicite otra empresa', async operation => {
    const args = await prepararConsulta('operaciones_carga',operation,{ where: { id_empresa: 8n }, data: {} },actor,{});
    expect(args.where.AND[1]).toEqual({ id_empresa: 7n, id_repartidor_asignado: 9n });
  });
  it('protege también los destinos del repartidor', () => expect(alcanceModelo('items_reparto',actor)).toEqual({ id_empresa: 7n, detalle_carga: { operaciones_carga: { id_repartidor_asignado: 9n } } }));
  it('rechaza escribir para otra empresa', async () => { await expect(prepararConsulta('clientes','create',{ data: { id_empresa: 8n } },actor,{})).rejects.toThrow('empresa'); });
  it('valida las claves relacionadas antes de escribir', async () => {
    const base = { operaciones_carga: { findFirst: jest.fn(async () => null) } };
    await expect(prepararConsulta('detalle_carga','create',{ data: { id_operacion: 99n } },actor,base)).rejects.toThrow('Relación no autorizada');
    expect(base.operaciones_carga.findFirst).toHaveBeenCalledWith({ where: { id_operacion: 99n, AND: { id_empresa: 7n, id_repartidor_asignado: 9n } } });
  });
  it('no acepta escrituras anidadas que evadan validación', async () => { await expect(prepararConsulta('detalle_carga','create',{ data: { operaciones_carga: { connect: { id_operacion: 1 } } } },actor,{})).rejects.toThrow('identificadores explícitos'); });
  it('falla sin contexto y reserva el cierre a responsables', () => {
    expect(actorActual).toThrow(); requestContext.run(actor, () => expect(exigirSupervisor).toThrow());
    requestContext.run({ ...actor, roles: ['supervisor'], repartidor: false }, () => expect(exigirSupervisor).not.toThrow());
  });
});
