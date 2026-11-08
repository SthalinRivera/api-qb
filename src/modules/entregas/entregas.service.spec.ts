import { EntregasService } from './entregas.service';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

describe('EntregasService: secuencia y saldos', () => {
  let service: EntregasService;
  let prisma: any;
  let item: any;
  const dto = () => ({
    id_item_reparto: 5,
    fecha_entrega: '2026-11-08',
    hora_entrega: '10:30',
    cantidad_entregada: 5,
    cantidad_rechazada: 0,
    estado_entrega: 'entregado_parcial',
    nombre_recibe: 'Ana',
  });
  beforeEach(() => {
    item = {
      id_item_reparto: 5n,
      id_empresa: 1n,
      id_puesto: 3n,
      cantidad_asignada: 10,
      entregas: [],
      guias_operativas: [],
      detalle_carga: {
        id_operacion: 7n,
        id_cliente_emisor: 1n,
        id_tipo_jaba: 2n,
        cantidad_jabas: 10,
        requiere_retorno_jabas: true,
        detalle_carga_calidades: [],
        operaciones_carga: {
          id_operacion: 7n,
          estado: 'repartiendo',
          fecha_carga: new Date('2026-11-07'),
          id_repartidor_asignado: null,
        },
      },
    };
    prisma = {
      $transaction: async (callback: any) => callback(prisma),
      $queryRaw: jest.fn(),
      items_reparto: { findUnique: jest.fn(async () => item) },
      entregas: {
        create: jest.fn(async ({ data }: any) => ({
          ...data,
          id_entrega: 42n,
        })),
      },
      guias_operativas: {
        create: jest.fn(async ({ data }: any) => ({ ...data, id_guia: 9n })),
      },
      detalle_carga: {
        findMany: jest.fn(async () => [
          {
            id_detalle_carga: 1,
            cantidad_jabas: 10,
            es_reparto: false,
            detalle_carga_calidades: [],
            items_reparto: [
              {
                cantidad_asignada: 10,
                id_cliente_receptor: 2,
                entregas: [
                  {
                    cantidad_entregada: 5,
                    cantidad_rechazada: 0,
                    estado_entrega: 'entregado_parcial',
                  },
                ],
              },
            ],
          },
        ]),
      },
      operaciones_carga: { update: jest.fn() },
      jabas_por_pagar: { create: jest.fn() },
      jabas_por_cobrar: { create: jest.fn() },
      logs_actividad: { create: jest.fn() },
    };
    service = new EntregasService(prisma);
  });
  it('crea la guía automáticamente y cobra solo las jabas recibidas sin duplicar la deuda del emisor', async () => {
    const entrega = await service.create(dto());
    expect(entrega.id_entrega).toBe(42n);
    expect(prisma.guias_operativas.create).toHaveBeenCalledTimes(1);
    expect(prisma.jabas_por_pagar.create).not.toHaveBeenCalled();
    expect(prisma.jabas_por_cobrar.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ cantidad_original: 5 }),
    });
    expect(prisma.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it('reutiliza la guía del destino', async () => {
    item.guias_operativas = [{ id_guia: 9n, estado: 'emitida' }];
    await service.create(dto());
    expect(prisma.guias_operativas.create).not.toHaveBeenCalled();
  });
  it('bloquea entregas antes de confirmar la carga o después de cancelar', async () => {
    for (const estado of ['en_curso', 'pendiente', 'cancelado']) {
      item.detalle_carga.operaciones_carga.estado = estado;
      await expect(service.create(dto())).rejects.toThrow('Primero completa');
    }
    expect(prisma.entregas.create).not.toHaveBeenCalled();
  });
  it('rechaza registrar dos veces una entrega completa', async () => {
    item.entregas = [
      { cantidad_entregada: 10, estado_entrega: 'entregado_total' },
    ];
    await expect(service.create(dto())).rejects.toThrow('ya está completa');
    expect(prisma.entregas.create).not.toHaveBeenCalled();
  });
  it('rechaza una guía de otro destino', async () => {
    await expect(service.create({ ...dto(), id_guia: 99 })).rejects.toThrow(
      'no corresponde',
    );
  });
  it('no genera deudas para jabas sin retorno', async () => {
    item.detalle_carga.requiere_retorno_jabas = false;
    await service.create(dto());
    expect(prisma.jabas_por_pagar.create).not.toHaveBeenCalled();
    expect(prisma.jabas_por_cobrar.create).not.toHaveBeenCalled();
  });
  it('rechaza una entrega anterior a la carga', async () => {
    await expect(
      service.create({ ...dto(), fecha_entrega: '2026-11-06' }),
    ).rejects.toThrow('anterior');
  });
});
