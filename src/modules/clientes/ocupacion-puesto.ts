import { BadRequestException } from '@nestjs/common';
export function normalizarSeccion(value?: string | null): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw new BadRequestException('La sección debe ser A, B, C o null.');
  if (value.trim() === '') return null;
  const seccion = value.trim();
  if (!['A', 'B', 'C'].includes(seccion)) throw new BadRequestException('La sección debe ser A, B, C o null para puesto completo.');
  return seccion;
}
export function ocupacionIncompatible(id_empresa: bigint, id_puesto: number, seccion: string | null) {
  return { id_empresa, id_puesto: BigInt(id_puesto), estado: true, fecha_fin: null,
    ...(seccion === null ? {} : { OR: [{ seccion: null }, { seccion }] }),
  };
}
