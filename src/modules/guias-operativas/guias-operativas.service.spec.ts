import { GuiasOperativasService } from './guias-operativas.service';
describe('Emisión documental', () => {
  const setup = () => {
    const item: any = { id_item_reparto: 1n, id_detalle_carga: 2n, id_cliente_receptor: 3n, id_puesto: 4n, cantidad_asignada: 10, guias_operativas: [], entregas: [], items_reparto_detalle: [{ id_detalle_carga_calidad: 1, cantidad: 10, detalle_carga_calidades: { calidades: { nombre: "Primera" } } }], detalle_carga: { es_reparto: false, frutas: { nombre: 'Lima' } } };
    const prisma: any = { empresaId: 7n, $queryRaw: jest.fn(), operaciones_carga: { findUnique: jest.fn(async () => ({ id_operacion: 5n, id_empresa: 7n, estado: 'en_transito' })), update: jest.fn() },
      detalle_carga: { findMany: jest.fn(async () => [{ cantidad_jabas: 10, items_reparto: [item], detalle_carga_calidades: [{ id_detalle_carga_calidad: 1, cantidad: 10 }] }]) },
      items_reparto: { findMany: jest.fn(async () => [item]) },
      guias_operativas: { create: jest.fn(async ({data}) => { const guia = { ...data, id_guia: 6n }; item.guias_operativas.push(guia); return guia; }) },
    };
    prisma.scoped = prisma; prisma.$transaction = jest.fn(async (fn, _options) => fn(prisma));
    return { item, prisma, service: new GuiasOperativasService(prisma) };
  };
  it('inicia entrega al emitir y reutiliza la guía sin modificar su cobertura', async () => {
    const { service, prisma, item } = setup();
    const first = await service.emitirOperacion(5);
    expect(prisma.operaciones_carga.update).toHaveBeenCalledWith({
      where: { id_operacion: 5n }, data: { estado: 'repartiendo' },
    });
    prisma.operaciones_carga.findUnique.mockResolvedValue({ id_operacion: 5n, id_empresa: 7n, estado: 'repartiendo' });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 30_000 });
    item.detalle_carga.frutas.nombre = 'Nombre editado';
    const second = await service.emitirOperacion(5);
    expect(prisma.guias_operativas.create).toHaveBeenCalledTimes(1);
    expect(prisma.operaciones_carga.update).toHaveBeenCalledTimes(1);
    expect(second[0].id_guia).toBe(first[0].id_guia);
    expect(second[0].cobertura.producto.nombre).toBe('Lima');
    expect(second[0].cobertura.id_item_reparto).toBe('1');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it('emite guías faltantes y conserva una guía histórica de un destino ya entregado', async () => {
    const { service, prisma, item } = setup();
    const guiaHistorica = { id_guia: 64n, estado: 'emitida' };
    const destinoEntregado = {
      ...item,
      cantidad_asignada: 138,
      items_reparto_detalle: [{ id_detalle_carga_calidad: 1, cantidad: 138, detalle_carga_calidades: { calidades: { nombre: "Primera" } } }],
      entregas: [{ cantidad_entregada: 138, estado_entrega: 'entregado_total' }],
      guias_operativas: [guiaHistorica],
    };
    const destinoPendiente = {
      ...item,
      id_item_reparto: 2n,
      cantidad_asignada: 75,
      items_reparto_detalle: [{ id_detalle_carga_calidad: 1, cantidad: 75, detalle_carga_calidades: { calidades: { nombre: "Primera" } } }],
      entregas: [],
      guias_operativas: [],
    };
    prisma.detalle_carga.findMany.mockResolvedValue([{
      cantidad_jabas: 213,
      es_reparto: false,
      detalle_carga_calidades: [{ id_detalle_carga_calidad: 1, cantidad: 213 }],
      items_reparto: [destinoEntregado, destinoPendiente],
    }]);
    prisma.items_reparto.findMany.mockResolvedValue([destinoEntregado, destinoPendiente]);

    const guias = await service.emitirOperacion(5);

    expect(prisma.guias_operativas.create).toHaveBeenCalledTimes(1);
    expect(prisma.guias_operativas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_item_reparto: destinoPendiente.id_item_reparto }),
      }),
    );
    expect(guias).toHaveLength(2);
    expect(guias[0]).toBe(guiaHistorica);
  });
  it('no emite desde preparación', async () => { const {service,prisma} = setup(); prisma.operaciones_carga.findUnique.mockResolvedValue({ estado: 'en_curso' }); await expect(service.emitirOperacion(5)).rejects.toThrow('tránsito'); });
  it('emite solo el destino seleccionado aunque queden jabas y otros productos sin asignar', async () => {
    const { service, prisma, item } = setup();
    prisma.detalle_carga.findMany.mockResolvedValue([
      { cantidad_jabas: 100, detalle_carga_calidades: [{ id_detalle_carga_calidad: 1, cantidad: 100 }], items_reparto: [item] },
      { cantidad_jabas: 50, detalle_carga_calidades: [], items_reparto: [] },
    ]);
    await service.emitirOperacion(5, 1);
    expect(prisma.items_reparto.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { detalle_carga: { id_operacion: 5 }, id_item_reparto: 1 },
    }));
    expect(prisma.guias_operativas.create).toHaveBeenCalledTimes(1);
    expect(prisma.guias_operativas.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ id_item_reparto: 1n }),
    }));
  });
  it('no emite un destino sin receptor ni un desglose inconsistente', async () => {
    const { service, prisma, item } = setup();
    item.id_cliente_receptor = null;
    await expect(service.emitirOperacion(5, 1)).rejects.toThrow('Revisa el receptor');
    item.id_cliente_receptor = 3n;
    item.items_reparto_detalle[0].cantidad = 9;
    await expect(service.emitirOperacion(5, 1)).rejects.toThrow('cantidades');
    expect(prisma.guias_operativas.create).not.toHaveBeenCalled();
  });
  it('rechaza un destino de otra operación sin emitir guías', async () => {
    const { service, prisma } = setup();
    prisma.items_reparto.findMany.mockResolvedValue([]);
    await expect(service.emitirOperacion(5, 77)).rejects.toThrow('No hay destinos');
    expect(prisma.guias_operativas.create).not.toHaveBeenCalled();
  });
  it('rechaza un identificador cero sin convertirlo en emisión masiva', async () => {
    const { service, prisma } = setup();
    await expect(service.emitirOperacion(5, 0)).rejects.toThrow('identificadores válidos');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('actualiza tránsito al reintentar una emisión con guía vigente', async () => {
    const { service, prisma, item } = setup();
    item.guias_operativas = [{ id_guia: 8n, estado: 'emitida', cobertura: { cantidad: 10 } }];
    await service.emitirOperacion(5, 1);
    expect(prisma.guias_operativas.create).not.toHaveBeenCalled();
    expect(prisma.operaciones_carga.update).toHaveBeenCalledWith({
      where: { id_operacion: 5n }, data: { estado: 'repartiendo' },
    });
  });
  it('no cambia estado cuando falla la emisión', async () => {
    const { service, prisma } = setup();
    prisma.guias_operativas.create.mockRejectedValue(new Error('Error de emisión'));
    await expect(service.emitirOperacion(5)).rejects.toThrow('Error de emisión');
    expect(prisma.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it('no inicia entrega cuando no hay una guía vigente con cobertura', async () => {
    const { service, prisma, item } = setup();
    item.entregas = [{ cantidad_entregada: 10, estado_entrega: 'entregado_total' }];
    await expect(service.emitirOperacion(5)).resolves.toEqual([]);
    expect(prisma.operaciones_carga.update).not.toHaveBeenCalled();
  });
  it('no inventa guías para entregas históricas sin documento vigente', async () => { const {service,item} = setup(); item.entregas = [{cantidad_entregada: 1}]; await expect(service.emitirOperacion(5)).rejects.toThrow('revisión documental'); });
  it('no reutiliza una guía sin cobertura para un destino que aún tiene saldo', async () => {
    const { service, prisma, item } = setup();
    item.guias_operativas = [{ id_guia: 8n, estado: 'emitida' }];

    await expect(service.emitirOperacion(5)).rejects.toThrow(
      'guía histórica sin cobertura y saldo pendiente',
    );
    expect(prisma.guias_operativas.create).not.toHaveBeenCalled();
  });
});
