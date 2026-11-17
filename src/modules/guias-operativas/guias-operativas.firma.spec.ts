import { GuiasOperativasService } from './guias-operativas.service';

describe('Firma de guías después de completar la entrega', () => {
  function setup(estadoOperacion = 'completado', estadoGuia = 'emitida', firma = true) {
    const guia = { id_guia: 8n, estado: estadoGuia, entregas: [{ firma_recibido: firma }] };
    const tx = {
      $queryRaw: jest.fn(),
      operaciones_carga: { findUniqueOrThrow: jest.fn().mockResolvedValue({ estado: estadoOperacion }) },
      guias_operativas: {
        findUnique: jest.fn().mockResolvedValue({ items_reparto: { detalle_carga: { id_operacion: 66n } } }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(guia),
        update: jest.fn().mockImplementation(async ({ data }) => ({ ...guia, ...data })),
      },
    };
    const prisma: any = { empresaId: 1n, scoped: { $transaction: async fn => fn(tx) } };
    return { service: new GuiasOperativasService(prisma), tx };
  }

  it.each(['en_transito', 'repartiendo', 'completado'])('permite firmar en %s con firma de recepción', async estado => {
    const { service, tx } = setup(estado);
    await expect(service.sign(8)).resolves.toMatchObject({ estado: 'firmada' });
    expect(tx.guias_operativas.update).toHaveBeenCalledWith({
      where: { id_guia: 8 }, data: { estado: 'firmada', observaciones: undefined },
    });
  });

  it('permite la misma transición desde el endpoint de estado', async () => {
    const { service } = setup();
    await expect(service.changeState(8, 'firmada')).resolves.toMatchObject({ estado: 'firmada' });
  });

  it('conserva el requisito de firma de recepción', async () => {
    const { service, tx } = setup('completado', 'emitida', false);
    await expect(service.sign(8)).rejects.toThrow('Primero registra la firma de recepción');
    expect(tx.guias_operativas.update).not.toHaveBeenCalled();
  });

  it.each(['anulada', 'reemplazada'])('no permite firmar una guía %s', async estado => {
    const { service, tx } = setup('completado', estado);
    await expect(service.sign(8)).rejects.toThrow('no se puede reabrir');
    expect(tx.guias_operativas.update).not.toHaveBeenCalled();
  });

  it.each(['pendiente', 'en_curso', 'cancelado'])('no habilita firmas en %s', async estado => {
    const { service, tx } = setup(estado);
    await expect(service.sign(8)).rejects.toThrow('no permite cambios documentales');
    expect(tx.guias_operativas.update).not.toHaveBeenCalled();
  });

  it('mantiene bloqueadas la anulación, observación y edición de cargas completadas', async () => {
    const { service, tx } = setup();
    await expect(service.remove(8)).rejects.toThrow('no permite cambios documentales');
    await expect(service.changeState(8, 'observada')).rejects.toThrow('no permite cambios documentales');
    await expect(service.update(8, { observaciones: 'Cambio' })).rejects.toThrow('no permite cambios documentales');
    expect(tx.guias_operativas.update).not.toHaveBeenCalled();
  });
});