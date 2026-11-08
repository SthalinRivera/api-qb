import { describe, it, expect } from '@jest/globals';
import { cargaEditable, resumenFlujo } from './flujo-operacion';

const detalle = () => ({
  id_detalle_carga: 1,
  cantidad_jabas: 10,
  es_reparto: false,
  detalle_carga_calidades: [] as { cantidad: number }[],
  items_reparto: [
    {
      cantidad_asignada: 10,
      id_cliente_receptor: 2,
      entregas: [] as {
        cantidad_entregada: number;
        cantidad_rechazada: number;
        estado_entrega: string;
      }[],
    },
  ],
});
describe('Secuencia de operaciones', () => {
  it('no permite avanzar una carga vacía', () =>
    expect(resumenFlujo([]).listaParaEntregar).toBe(false));
  it('omite calidad para una entrega directa', () =>
    expect(resumenFlujo([detalle()])).toMatchObject({
      requiereCalidad: false,
      listaParaEntregar: true,
      entregasCompletas: false,
    }));
  it('exige clasificar todo el reparto y no acepta excesos', () => {
    const d = detalle();
    d.es_reparto = true;
    for (const cantidad of [0, 9, 11]) {
      d.detalle_carga_calidades = [{ cantidad }];
      expect(resumenFlujo([d]).listaParaEntregar).toBe(false);
    }
    d.detalle_carga_calidades = [{ cantidad: 10 }];
    expect(resumenFlujo([d]).listaParaEntregar).toBe(true);
  });
  it('exige asignar todos los destinos', () => {
    const d = detalle();
    d.items_reparto[0].cantidad_asignada = 9;
    expect(resumenFlujo([d]).destinoPendiente).toBe(1);
  });
  it('no confunde entrega pendiente ni rechazos con entrega completa', () => {
    const d = detalle();
    d.items_reparto[0].entregas = [
      {
        cantidad_entregada: 10,
        cantidad_rechazada: 0,
        estado_entrega: 'pendiente',
      },
    ];
    expect(resumenFlujo([d]).entregasCompletas).toBe(false);
    d.items_reparto[0].entregas = [
      {
        cantidad_entregada: 6,
        cantidad_rechazada: 4,
        estado_entrega: 'entregado_parcial',
      },
    ];
    expect(resumenFlujo([d]).entregasCompletas).toBe(false);
    d.items_reparto[0].entregas.push({
      cantidad_entregada: 4,
      cantidad_rechazada: 0,
      estado_entrega: 'entregado_total',
    });
    expect(resumenFlujo([d]).entregasCompletas).toBe(true);
  });
  it('bloquea cargas despachadas, completas y canceladas', () => {
    for (const estado of [
      'repartiendo',
      'en_transito',
      'completado',
      'cancelado',
      'cancelada',
    ])
      expect(cargaEditable(estado)).toBe(false);
  });
});
