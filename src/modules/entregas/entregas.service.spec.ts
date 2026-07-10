import { EntregasService } from './entregas.service';

describe('EntregasService', () => {
  let service: EntregasService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      $transaction: async (callback: any) => callback(prisma),
      entregas: { create: jest.fn() },
      guias_operativas: { findMany: jest.fn() },
      operaciones_carga: { update: jest.fn() },
      jabas_por_pagar: { create: jest.fn() },
      jabas_por_cobrar: { create: jest.fn() },
      logs_actividad: { create: jest.fn() },
    };

    service = new EntregasService(prisma as any);
  });

  it('crea los registros de jabas por pagar y por cobrar cuando la entrega requiere retorno', async () => {
    prisma.entregas.create.mockResolvedValue({
      id_entrega: 42,
      guias_operativas: {
        items_reparto: {
          detalle_carga: {
            id_operacion: 7,
            id_cliente_emisor: 1,
            id_tipo_jaba: 2,
            cantidad_jabas: 10,
            requiere_retorno_jabas: true,
          },
        },
      },
    });
    prisma.guias_operativas.findMany.mockResolvedValue([{ estado: 'pendiente' }]);

    const entrega = await service.create({
      id_guia: 1,
      id_item_reparto: 5,
      id_entregador: 3,
      fecha_entrega: '2026-07-08',
      hora_entrega: '10:30',
      cantidad_entregada: 5,
      cantidad_rechazada: 0,
      estado_entrega: 'pendiente',
      firma_recibido: false,
      observaciones: 'test',
      requiere_retorno_jabas: true,
      cantidad_jabas: 10,
      id_cliente_emisor: 1,
      id_tipo_jaba: 2,
    } as any);

    expect(entrega.id_entrega).toBe(42);
    expect(prisma.jabas_por_pagar.create).toHaveBeenCalled();
    expect(prisma.jabas_por_cobrar.create).toHaveBeenCalled();
  });
});
