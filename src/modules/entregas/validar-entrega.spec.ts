import { describe, it, expect } from '@jest/globals';
import { validarEntrega } from './validar-entrega';
describe('Validación de entrega', () => {
  it('acepta entrega total y parcial coherentes', () => {
    expect(() =>
      validarEntrega(10, 0, 'entregado_total', 10, 'Ana'),
    ).not.toThrow();
    expect(() =>
      validarEntrega(6, 4, 'entregado_parcial', 10, 'Ana'),
    ).not.toThrow();
  });
  it.each([
    [11, 0, 'entregado_total', 10, 'Ana'],
    [1, 0, 'entregado_total', 0, 'Ana'],
    [6, 0, 'entregado_total', 10, 'Ana'],
    [10, 0, 'entregado_parcial', 10, 'Ana'],
    [10, 0, 'pendiente', 10, 'Ana'],
    [1.5, 0, 'entregado_parcial', 10, 'Ana'],
    [10, 0, 'entregado_total', 10, '  '],
  ])(
    'rechaza cantidades, estados o receptor inconsistentes',
    (cantidad, rechazada, estado, saldo, nombre) => {
      expect(() =>
        validarEntrega(
          Number(cantidad),
          Number(rechazada),
          String(estado),
          Number(saldo),
          String(nombre),
        ),
      ).toThrow();
    },
  );
});
