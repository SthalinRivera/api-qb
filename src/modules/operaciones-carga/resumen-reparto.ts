/** Saldos locales antes de sumar: un exceso de una línea nunca compensa otra. */
export function resumenReparto(cargas: any[]) {
  const puestos = new Set<string>();
  const lineas = cargas.map((carga) => {
    const calidades = carga.detalle_carga_calidades || [];
    const items = carga.items_reparto || [];
    const clasificado = calidades.reduce((s: number, c: any) => s + c.cantidad, 0);
    const asignado = items.reduce((s: number, i: any) => s + i.cantidad_asignada, 0);
    const requiereCalidad = !!carga.es_reparto || calidades.length > 0;
    const saldosCalidad = calidades.map((c: any) => {
      const asignadoCalidad = items.flatMap((i: any) => i.items_reparto_detalle || [])
        .filter((d: any) => String(d.id_detalle_carga_calidad) === String(c.id_detalle_carga_calidad))
        .reduce((s: number, d: any) => s + d.cantidad, 0);
      return { id_detalle_carga_calidad: c.id_detalle_carga_calidad, cantidad: c.cantidad,
        asignadas: asignadoCalidad, saldo: Math.max(0, c.cantidad - asignadoCalidad), exceso: Math.max(0, asignadoCalidad - c.cantidad) };
    });
    const destinos = items.map((item: any) => {
      if (item.id_puesto) puestos.add(String(item.id_puesto));
      const recibidas = (item.entregas || []).filter((e: any) => e.estado_entrega !== 'pendiente').reduce((s: number, e: any) => s + e.cantidad_entregada, 0);
      const resueltas = (item.resoluciones_reparto || []).reduce((s: number, r: any) => s + r.cantidad, 0);
      const desglose = (item.items_reparto_detalle || []).reduce((s: number, d: any) => s + d.cantidad, 0);
      const desgloseInvalido = requiereCalidad && (desglose !== item.cantidad_asignada || (item.items_reparto_detalle || []).some((d: any) => !calidades.some((c: any) => String(c.id_detalle_carga_calidad) === String(d.id_detalle_carga_calidad))));
      return { id_item_reparto: item.id_item_reparto, asignadas: item.cantidad_asignada, recibidas, resueltas,
        saldo: Math.max(0, item.cantidad_asignada - recibidas - resueltas), exceso: Math.max(0, recibidas + resueltas - item.cantidad_asignada),
        desgloseInvalido, resuelto: item.cantidad_asignada > 0 && recibidas + resueltas === item.cantidad_asignada };
    });
    return { id_detalle_carga: carga.id_detalle_carga, cargadas: carga.cantidad_jabas, asignadas: asignado,
      sinAsignar: Math.max(0, carga.cantidad_jabas - asignado), excesoAsignacion: Math.max(0, asignado - carga.cantidad_jabas),
      sinClasificar: requiereCalidad ? Math.max(0, carga.cantidad_jabas - clasificado) : 0,
      excesoClasificacion: Math.max(0, clasificado - carga.cantidad_jabas), saldosCalidad, destinos };
  });
  const destinos = lineas.flatMap((l) => l.destinos);
  const sumar = (key: string) => lineas.reduce((s, l) => s + l[key], 0);
  const desglosesIncompletos = destinos.filter((i) => i.desgloseInvalido).length;
  const excesosCalidad = lineas.flatMap((l) => l.saldosCalidad).reduce((s, c) => s + c.exceso, 0);
  const preparada = lineas.length > 0 && !sumar('sinAsignar') && !sumar('excesoAsignacion') && !sumar('sinClasificar') && !sumar('excesoClasificacion') && !desglosesIncompletos && !excesosCalidad;
  return { lineas, jabasCargadas: sumar('cargadas'), jabasAsignadas: sumar('asignadas'),
    jabasSinAsignar: sumar('sinAsignar'), excesosAsignacion: sumar('excesoAsignacion'),
    jabasSinClasificar: sumar('sinClasificar'), excesosClasificacion: sumar('excesoClasificacion'), excesosCalidad,
    desglosesIncompletos, puestosDistintos: puestos.size, totalItems: destinos.length,
    itemsResueltos: destinos.filter((i) => i.resuelto).length,
    saldoEntrega: destinos.reduce((s, i) => s + i.saldo, 0), excesosEntrega: destinos.reduce((s, i) => s + i.exceso, 0),
    progreso: destinos.length ? Math.round(destinos.filter((i) => i.resuelto).length * 100 / destinos.length) : 0,
    preparada, conciliada: preparada && destinos.length > 0 && destinos.every((i) => i.resuelto) };
}
