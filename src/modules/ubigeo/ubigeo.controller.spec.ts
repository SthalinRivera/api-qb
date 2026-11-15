import { UbigeoController } from './ubigeo.controller';
describe('Zonas de la empresa autenticada', () => {
  it('filtra por vínculos y lugares activos sin duplicar distritos', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const controller = new UbigeoController({ empresaId: 7n, scoped: { distritos: { findMany } } } as any);
    await controller.distritos({ empresa: 'true', id_provincia: '1505' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      id_provincia: '1505', lugares_operativos: { some: { estado: true, empresa_lugares: { some: { id_empresa: 7n, estado: true } } } },
    }) }));
  });
  it('mantiene la consulta geográfica global sin el filtro', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const controller = new UbigeoController({ scoped: { distritos: { findMany } } } as any);
    await controller.distritos({});
    expect(findMany.mock.calls[0][0].where).not.toHaveProperty('lugares_operativos');
  });
});
