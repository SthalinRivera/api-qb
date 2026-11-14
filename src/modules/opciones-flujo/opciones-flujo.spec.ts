import { OpcionesFlujoController } from './opciones-flujo.controller';
import { validarReceptor } from './reglas-opciones';
import { DetalleCargaService } from '../detalle-carga/detalle-carga.service';

function setup() {
  const delegate = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
  });
  const db: any = {
    empresaId: 7n,
    distritos: delegate(),
    usuarios: delegate(),
    camiones: delegate(),
    clientes: delegate(),
    puestos: delegate(),
    clientes_puestos: delegate(),
    frutas: delegate(),
    variedades: delegate(),
    tipos_jaba: delegate(),
    detalle_carga: delegate(),
    operaciones_carga: delegate(),
    calidades: delegate(),
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  db.scoped = db;
  db.operaciones_carga.findUnique.mockResolvedValue({
    id_operacion: 3n,
    id_ubigeo_origen: '150101',
    id_ubigeo_destino: '150102',
    estado: 'repartiendo',
  });
  return { db, controller: new OpcionesFlujoController(db) };
}

describe('Opciones del flujo por contexto', () => {
  it('ofrece para entrega solo cargas clasificadas, sin exigir destinos todavía', async () => {
    const { db, controller } = setup();
    const carga = (id: number, cantidades: number[], es_reparto = true, cantidad_jabas = 10) => ({
      id_operacion: id, estado: 'en_curso', fecha_carga: '2026-11-14',
      detalle_carga: [{ cantidad_jabas, es_reparto, detalle_carga_calidades: cantidades.map(cantidad => ({ cantidad })) }],
    });
    db.operaciones_carga.findMany.mockResolvedValue([
      carga(1, [4, 6]), carga(2, [4]), carga(3, [11]), carga(4, [], false),
      carga(5, [3], false), { ...carga(6, []), detalle_carga: [] }, carga(7, [], false, 0),
    ]);
    const result = await controller.operaciones({ proceso: 'entrega', buscar: '60' });
    expect(result.map(op => op.id_operacion)).toEqual([1, 4]);
    expect(result[0]).not.toHaveProperty('detalle_carga');
    expect(db.operaciones_carga.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        estado: { in: ['en_curso', 'en_transito', 'repartiendo'] },
        OR: expect.arrayContaining([{ id_operacion: 60n }]),
      }),
    }));
  });
  it('mantiene el catálogo general sin filtrar cargas incompletas', async () => {
    const { db, controller } = setup();
    db.operaciones_carga.findMany.mockResolvedValue([{ id_operacion: 1, detalle_carga: [] }]);
    expect(await controller.operaciones({})).toEqual([{ id_operacion: 1 }]);
    expect(db.operaciones_carga.findMany.mock.calls[0][0].where.estado.in).toContain('pendiente');
  });
  it('no carga destinos hasta elegir un origen ni devuelve relaciones completas de usuarios', async () => {
    const { db, controller } = setup();
    expect((await controller.opcionesOperacion({})).destinos).toEqual([]);
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.usuarios.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_empresa: 7n,
          estado: true,
          usuarios_roles: expect.any(Object),
        }),
        select: { id_usuario: true, nombres: true, apellidos: true },
      }),
    );
  });
  it('rechaza un origen sin emisores de la empresa', async () => {
    const { controller, db } = setup();
    await expect(
      controller.opcionesOperacion({ origen: '150101' }),
    ).rejects.toThrow('emisores activos');
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
  it('filtra emisores por origen, variedades por fruta y no descarga puestos sin receptor', async () => {
    const { db, controller } = setup();
    await controller.carga({ operacion: 3, fruta: 11 });
    expect(db.variedades.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_fruta: 11, estado: true, frutas: { estado: true } },
        select: { id_variedad: true, nombre: true },
      }),
    );
    expect(
      db.clientes.findMany.mock.calls[0][0].where.cliente_distrito.some,
    ).toMatchObject({
      id_empresa: 7n,
      id_ubigeo: '150101',
      tipo_relacion: { in: ['emisor', 'ambos'] },
    });
    expect(db.puestos.findMany).not.toHaveBeenCalled();
  });
  it('consulta puestos y secciones solo del receptor y destino elegidos', async () => {
    const { db, controller } = setup();
    await controller.carga({ operacion: 3, cliente: 8, puesto: 9 });
    expect(db.puestos.findMany.mock.calls[0][0].where).toMatchObject({
      estado: true,
      lugares_operativos: {
        id_ubigeo: '150102',
        empresa_lugares: { some: { id_empresa: 7n, estado: true } },
      },
      clientes_puestos: {
        some: { id_cliente: 8, estado: true, fecha_fin: null },
      },
    });
    expect(db.clientes_puestos.findMany.mock.calls[0][0].where).toMatchObject({
      id_cliente: 8,
      id_puesto: 9,
      estado: true,
      fecha_fin: null,
    });
  });
  it('rechaza una operación fuera del alcance antes de ejecutar SQL de pendientes', async () => {
    const { db, controller } = setup();
    db.operaciones_carga.findUnique.mockResolvedValue(null);
    await expect(controller.entrega({ operacion: 99 })).rejects.toThrow(
      'no encontrada',
    );
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
  it('no ofrece entregas antes de iniciar reparto', async () => {
    const { db, controller } = setup();
    db.operaciones_carga.findUnique.mockResolvedValue({
      estado: 'en_transito',
    });
    expect(await controller.entrega({ operacion: 3 })).toEqual({ items: [] });
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
  it('calcula saldo en SQL por empresa y operación sin descontar rechazos como recibidos', async () => {
    const { db, controller } = setup();
    await controller.entrega({ operacion: 3, item: 5 });
    const sql = db.$queryRaw.mock.calls[0][0];
    expect(sql.sql).toContain("estado_entrega <> 'pendiente'");
    expect(sql.sql).toContain(
      'i.cantidad_asignada > COALESCE(e.recibidas,0) + COALESCE(r.resueltas,0)',
    );
    expect(sql.sql).not.toContain('SUM(cantidad_rechazada)');
    expect(sql.values).toEqual(expect.arrayContaining([7n, 3n, 5n]));
  });
  it('rechaza un producto de otra operación antes de calcular cantidades disponibles', async () => {
    const { db, controller } = setup();
    await expect(
      controller.reparto({ operacion: 3, detalle: 77 }),
    ).rejects.toThrow('no encontrado');
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
  it('excluye calidades ya usadas en SQL, permitiendo la calidad que se está editando', async () => {
    const { db, controller } = setup();
    db.detalle_carga.findUnique.mockResolvedValue({ id_detalle_carga: 4n });
    await controller.calidades({ detalle: 4, calidad: 15 });
    expect(db.calidades.findMany.mock.calls[0][0].where).toEqual({
      estado: true,
      detalle_carga_calidades: {
        none: { id_detalle_carga: 4, id_detalle_carga_calidad: { not: 15 } },
      },
    });
  });
});
describe('Revalidación al guardar', () => {
  it('rechaza un puesto que dejó de ser compatible aunque su ID exista', async () => {
    const { db } = setup();
    await expect(validarReceptor(db, 7n, '150102', 8, 9)).rejects.toThrow(
      'destino',
    );
  });
  it('rechaza una sección ajena al receptor y puesto', async () => {
    const { db } = setup();
    db.puestos.findFirst.mockResolvedValue({ id_puesto: 9n });
    await expect(validarReceptor(db, 7n, '150102', 8, 9, 'A')).rejects.toThrow(
      'sección',
    );
  });
  it('rechaza una variedad incompatible con la fruta, incluso en una edición parcial fusionada', async () => {
    const { db } = setup();
    db.clientes.findFirst.mockResolvedValue({});
    db.frutas.findFirst.mockResolvedValue({});
    const service = new DetalleCargaService(db);
    await expect(
      (service as any).validateRelations(
        {
          id_cliente_emisor: 8,
          id_fruta: 11,
          id_variedad: 12,
          id_tipo_jaba: 2,
        },
        '150101',
        db,
      ),
    ).rejects.toThrow('variedad');
    expect(db.variedades.findFirst.mock.calls[0][0].where).toEqual({
      id_variedad: 12,
      id_fruta: 11,
      id_empresa: 7n,
      estado: true,
    });
  });
});
