import { BadRequestException } from '@nestjs/common';
import { calcularSaldoDestino, resumenReparto } from './resumen-reparto';

export function validarInicioReparto(detalles: any[]) {
  if (!resumenReparto(detalles).preparada)
    throw new BadRequestException('Completa la clasificación y asignación antes de iniciar el reparto.');
  if (detalles.some(d => d.items_reparto.some(i =>
    calcularSaldoDestino(i).saldo > 0 &&
    !i.guias_operativas.some(g => !['anulada', 'reemplazada'].includes(g.estado || '') && g.cobertura),
  )))
    throw new BadRequestException('Emite las guías de todos los destinos antes de iniciar el reparto.');
}
