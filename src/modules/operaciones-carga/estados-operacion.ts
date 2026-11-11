import { BadRequestException } from '@nestjs/common';

export const ESTADOS_OPERACION = ['pendiente', 'en_curso', 'en_transito', 'repartiendo', 'completado'] as const;
export const operacionAbierta = (estado: string | null) => ESTADOS_OPERACION.slice(0, 4).includes(estado as never);
export function validarTransicion(actual: string | null, siguiente: string) {
  const indice = ESTADOS_OPERACION.indexOf(actual as never);
  if (typeof siguiente !== 'string' || indice < 0 || ESTADOS_OPERACION[indice + 1] !== siguiente)
    throw new BadRequestException(`Transición no permitida: ${actual} → ${siguiente}.`);
}
