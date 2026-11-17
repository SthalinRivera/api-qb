import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GuiasOperativasService } from './guias-operativas.service';
import { QueryGuiasOperativasDto } from './dto/query-guias-operativas.dto';

describe('Listado paginado de guías', () => {
  function setup() {
    const guias = {
      findMany: jest.fn().mockResolvedValue([{ id_guia: 7 }]),
      count: jest.fn().mockResolvedValue(25),
      groupBy: jest.fn().mockResolvedValue([{ estado: 'emitida', _count: { _all: 25 } }]),
    };
    const service = new GuiasOperativasService({ scoped: { guias_operativas: guias } } as any);
    return { service, guias };
  }

  it('usa el mismo filtro en conteo y datos antes de paginar', async () => {
    const { service, guias } = setup();
    const result = await service.findAll({
      estado: 'emitida', fecha_emision: '2026-11-17', id_repartidor: 3, page: 2, limit: 10,
    });
    const where = {
      estado: 'emitida', id_repartidor: 3,
      fecha_emision: { gte: new Date('2026-11-17T00:00:00Z'), lt: new Date('2026-11-18T00:00:00Z') },
    };
    expect(guias.count).toHaveBeenCalledWith({ where });
    expect(guias.findMany).toHaveBeenCalledWith({
      where, skip: 10, take: 10,
      include: { usuarios: true, items_reparto: true },
      orderBy: [{ fecha_emision: 'desc' }, { id_guia: 'desc' }],
    });
    expect(result).toEqual({ data: [{ id_guia: 7 }], total: 25, page: 2, limit: 10 });
  });

  it('mantiene el contrato con valores predeterminados y sin resultados', async () => {
    const { service, guias } = setup();
    guias.findMany.mockResolvedValue([]);
    guias.count.mockResolvedValue(0);
    expect(await service.findAll(new QueryGuiasOperativasDto()))
      .toEqual({ data: [], total: 0, page: 1, limit: 20 });
    expect(guias.count).toHaveBeenCalledWith({ where: {} });
  });

  it('devuelve el total filtrado aunque la página solicitada esté vacía', async () => {
    const { service, guias } = setup();
    guias.findMany.mockResolvedValue([]);
    expect(await service.findAll({ estado: 'firmada', page: 4, limit: 10 }))
      .toEqual({ data: [], total: 25, page: 4, limit: 10 });
    expect(guias.count).toHaveBeenCalledWith({ where: { estado: 'firmada' } });
  });

  it('cuenta los estados sin limitarse a los registros de una página', async () => {
    const { service, guias } = setup();
    expect(await service.resumen({ page: 2, limit: 10 })).toEqual({ emitida: 25 });
    expect(guias.groupBy).toHaveBeenCalledWith({ by: ['estado'], where: {}, _count: { _all: true } });
    expect(guias.findMany).not.toHaveBeenCalled();
  });

  it('convierte parámetros numéricos enviados en la URL', async () => {
    const dto = plainToInstance(QueryGuiasOperativasDto, { page: '2', limit: '50', id_repartidor: '3' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ page: 2, limit: 50, id_repartidor: 3 });
  });

  it.each([{ page: 0 }, { page: 1.5 }, { limit: 0 }, { limit: 101 }, { limit: 'abc' }, { id_repartidor: -1 }])(
    'rechaza parámetros inválidos %j', async params => {
      expect((await validate(plainToInstance(QueryGuiasOperativasDto, params))).length).toBeGreaterThan(0);
    },
  );
});