export const cargaEditable = (estado: string | null) =>
  estado === 'pendiente' || estado === 'en_curso';


interface EntregaFlujo {
  cantidad_entregada: number;
  cantidad_rechazada: number | null;
  estado_entrega: string;
}
interface ItemFlujo {
  cantidad_asignada: number;
  id_cliente_receptor: bigint | number | null;
  entregas?: EntregaFlujo[];
}
interface DetalleFlujo {
  id_detalle_carga: bigint | number;
  cantidad_jabas: number;
  es_reparto: boolean | null;
  detalle_carga_calidades: { cantidad: number }[];
  items_reparto: ItemFlujo[];
}

export function resumenFlujo(detalles: DetalleFlujo[]) {
  const pendientes: string[] = [];
  let calidadPendiente = 0;
  let destinoPendiente = 0;
  let entregados = 0;
  let totalItems = 0;
  if (!detalles.length)
    pendientes.push('Agrega al menos un producto a la carga.');
  for (const detalle of detalles) {
    const totalCalidad = detalle.detalle_carga_calidades.reduce(
      (sum, c) => sum + c.cantidad,
      0,
    );
    if (
      (detalle.es_reparto || totalCalidad > 0) &&
      totalCalidad !== detalle.cantidad_jabas
    ) {
      calidadPendiente++;
      pendientes.push(
        `Carga #${detalle.id_detalle_carga}: clasifica las ${detalle.cantidad_jabas} jabas (${totalCalidad} clasificadas).`,
      );
    }
    const asignado = detalle.items_reparto.reduce(
      (sum, item) => sum + item.cantidad_asignada,
      0,
    );
    if (
      asignado !== detalle.cantidad_jabas ||
      detalle.items_reparto.some((item) => !item.id_cliente_receptor)
    ) {
      destinoPendiente++;
      pendientes.push(
        `Carga #${detalle.id_detalle_carga}: asigna receptor y puesto para todas las jabas (${asignado} de ${detalle.cantidad_jabas}).`,
      );
    }
    totalItems += detalle.items_reparto.length;
    for (const item of detalle.items_reparto) {
      const recibidas = (item.entregas || [])
        .filter((e) => e.estado_entrega !== 'pendiente')
        .reduce((sum, e) => sum + e.cantidad_entregada, 0);
      if (recibidas >= item.cantidad_asignada && item.cantidad_asignada > 0)
        entregados++;
    }
  }
  return {
    pendientes,
    calidadPendiente,
    destinoPendiente,
    totalItems,
    entregados,
    requiereCalidad: detalles.some(
      (d) => d.es_reparto || d.detalle_carga_calidades.length > 0,
    ),
    listaParaEntregar: pendientes.length === 0,
    entregasCompletas:
      pendientes.length === 0 && totalItems > 0 && entregados === totalItems,
  };
}
