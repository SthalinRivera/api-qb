import { GuiasOperativasService } from './guias-operativas.service';
describe('Emisión documental', () => {
  const setup = () => {
    const item: any = { id_item_reparto: 1n, id_detalle_carga: 2n, id_cliente_receptor: 3n, id_puesto: 4n, cantidad_asignada: 10, guias_operativas: [], entregas: [], items_reparto_detalle: [], detalle_carga: { es_reparto: false, frutas: { nombre: 'Lima' } } };
    const prisma: any = { empresaId: 7n, $queryRaw: jest.fn(), operaciones_carga: { findUnique: jest.fn(async () => ({ id_operacion: 5n, id_empresa: 7n, estado: 'en_transito' })), update: jest.fn() },
      detalle_carga: { findMany: jest.fn(async () => [{ cantidad_jabas: 10, items_reparto: [item], detalle_carga_calidades: [] }]) },
      items_reparto: { findMany: jest.fn(async () => [item]) },
      guias_operativas: { create: jest.fn(async ({data}) => { const guia = { ...data, id_guia: 6n }; item.guias_operativas.push(guia); return guia; }) },
    };
    prisma.scoped = prisma; prisma.$transaction = async fn => fn(prisma);
    return { item, prisma, service: new GuiasOperativasService(prisma) };
  };
  it('reutiliza la guía en reintentos sin cambiar estado ni cobertura', async () => {
    const { service, prisma, item } = setup();
    const first = await service.emitirOperacion(5);
    item.detalle_carga.frutas.nombre = 'Nombre editado';
    const second = await service.emitirOperacion(5);
    expect(prisma.guias_operativas.create).toHaveBeenCalledTimes(1);
    expect(prisma.operaciones_carga.update).not.toHaveBeenCalled();
    expect(second[0].id_guia).toBe(first[0].id_guia);
    expect(second[0].cobertura.producto.nombre).toBe('Lima');
    expect(second[0].cobertura.id_item_reparto).toBe('1');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it('no emite desde preparación', async () => { const {service,prisma} = setup(); prisma.operaciones_carga.findUnique.mockResolvedValue({ estado: 'en_curso' }); await expect(service.emitirOperacion(5)).rejects.toThrow('tránsito'); });
  it('no inventa guías para entregas históricas sin documento vigente', async () => { const {service,item} = setup(); item.entregas = [{cantidad_entregada: 1}]; await expect(service.emitirOperacion(5)).rejects.toThrow('revisión documental'); });
});
