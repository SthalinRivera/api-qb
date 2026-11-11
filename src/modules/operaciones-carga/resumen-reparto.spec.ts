import { resumenReparto } from './resumen-reparto';
import { validarTransicion, ESTADOS_OPERACION } from './estados-operacion';
const item = (cantidad = 10): any => ({ id_item_reparto: 1, id_cliente_receptor: 2, id_puesto: 1, cantidad_asignada: cantidad, entregas: [], items_reparto_detalle: [] });
const linea = (cantidad = 10): any => ({ id_detalle_carga: 1, cantidad_jabas: cantidad, es_reparto: false, items_reparto: [item(cantidad)], detalle_carga_calidades: [] });
describe('Conciliación por línea y destino', () => {
  it('no compensa faltantes de una línea con excesos de otra', () => {
    const a = linea(), b = linea(); a.items_reparto = [item(12)]; b.items_reparto = [item(8)];
    const r = resumenReparto([a,b]);
    expect(r.jabasCargadas).toBe(20); expect(r.jabasSinAsignar).toBe(2); expect(r.excesosAsignacion).toBe(2); expect(r.preparada).toBe(false);
  });
  it('cuenta directas una sola vez y puestos distintos', () => {
    const r = resumenReparto([linea(),linea()]);
    expect(r.jabasCargadas).toBe(20); expect(r.jabasAsignadas).toBe(20); expect(r.puestosDistintos).toBe(1); expect(r.preparada).toBe(true); expect(r.conciliada).toBe(false);
  });
  it('rechaza desgloses de otra calidad aunque sumen lo asignado', () => {
    const a = linea(); a.es_reparto = true; a.detalle_carga_calidades = [{ id_detalle_carga_calidad: 1, cantidad: 10 }]; a.items_reparto[0].items_reparto_detalle = [{ id_detalle_carga_calidad: 2, cantidad: 10 }];
    expect(resumenReparto([a]).desglosesIncompletos).toBe(1); expect(resumenReparto([a]).preparada).toBe(false);
  });
  it('un rechazo no resuelve saldo; devolución y merma sí', () => {
    const a = linea(); a.items_reparto[0].entregas = [{ cantidad_entregada: 6, cantidad_rechazada: 4, estado_entrega: 'entregado_parcial' }];
    expect(resumenReparto([a]).saldoEntrega).toBe(4);
    a.items_reparto[0].resoluciones_reparto = [{ tipo: 'devolucion', cantidad: 3 },{ tipo: 'merma', cantidad: 1 }];
    expect(resumenReparto([a]).conciliada).toBe(true); expect(resumenReparto([a]).progreso).toBe(100);
  });
  it('una sobreentrega impide cerrar', () => { const a = linea(); a.items_reparto[0].entregas = [{ cantidad_entregada: 11 }]; expect(resumenReparto([a]).conciliada).toBe(false); });
  it('la carga sin clasificar informa su faltante', () => { const a = linea(); a.es_reparto = true; expect(resumenReparto([a]).jabasSinClasificar).toBe(10); });
});
describe('Estados sin cancelación', () => {
  it('admite solo el avance inmediato', () => { for (let i=0; i<4; i++) expect(() => validarTransicion(ESTADOS_OPERACION[i],ESTADOS_OPERACION[i+1])).not.toThrow(); });
  it.each([['pendiente','repartiendo'],['completado','en_curso'],['en_curso','cancelado'],['en_transito','en_transito']])('rechaza %s → %s', (a,b) => expect(() => validarTransicion(a,b)).toThrow());
});
