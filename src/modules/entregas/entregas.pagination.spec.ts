import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, jest } from '@jest/globals';
import { EntregasService } from './entregas.service';
import { QueryEntregasDto } from './dto/query-entregas.dto';

describe('Listado paginado de entregas', () => {
  function setup() {
    const entregas = {
      findMany: jest.fn().mockResolvedValue([{ id_entrega: 4 }]),
      count: jest.fn().mockResolvedValue(24),
    };
    const service = new EntregasService({ scoped: { entregas } } as any);
    return { service, entregas };
  }

  it('aplica los filtros tanto al conteo como a los datos antes de paginar', async () => {
    const { service, entregas } = setup();
    const result = await service.findAll({
      id_operacion: 7,
      id_calidad: 3,
      id_guia: 5,
      id_item_reparto: 9,
      fecha_entrega: '2026-11-17',
      estado_entrega: 'entregado_total',
      page: 2,
      limit: 10,
    });
    const where = {
      items_reparto: {
        detalle_carga: {
          id_operacion: 7n,
          detalle_carga_calidades: { some: { id_calidad: 3n } },
        },
      },
      id_guia: 5,
      id_item_reparto: 9,
      estado_entrega: 'entregado_total',
      fecha_entrega: {
        gte: new Date('2026-11-17'),
        lt: new Date('2026-11-18'),
      },
    };

    expect(entregas.count).toHaveBeenCalledWith({ where });
    expect(entregas.findMany).toHaveBeenCalledWith({
      where,
      include: { guias_operativas: true, items_reparto: true, usuarios: true },
      orderBy: [{ fecha_entrega: 'desc' }, { id_entrega: 'desc' }],
      skip: 10,
      take: 10,
    });
    expect(result).toEqual({
      data: [{ id_entrega: 4 }],
      total: 24,
      page: 2,
      limit: 10,
    });
  });

  it('usa la página y el límite predeterminados y mantiene el contrato vacío', async () => {
    const { service, entregas } = setup();
    entregas.findMany.mockResolvedValue([]);
    entregas.count.mockResolvedValue(0);

    await expect(service.findAll(new QueryEntregasDto())).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it('transforma la paginación y rechaza valores inválidos', async () => {
    const dto = plainToInstance(QueryEntregasDto, {
      page: '2',
      limit: '50',
      id_guia: '5',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ page: 2, limit: 50, id_guia: 5 });

    for (const params of [{ page: 0 }, { limit: 101 }, { limit: 'abc' }]) {
      expect(
        (await validate(plainToInstance(QueryEntregasDto, params))).length,
      ).toBeGreaterThan(0);
    }
  });
});
