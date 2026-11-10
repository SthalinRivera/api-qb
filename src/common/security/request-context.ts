import { AsyncLocalStorage } from 'node:async_hooks';
import { ForbiddenException } from '@nestjs/common';

export interface Actor { empresaId: bigint; usuarioId: bigint; roles: string[]; repartidor: boolean; administrador: boolean; }
export const requestContext = new AsyncLocalStorage<Actor>();
export function actorActual(): Actor {
  const actor = requestContext.getStore();
  if (!actor) throw new ForbiddenException('Falta el contexto autenticado de empresa.');
  return actor;
}
export function exigirSupervisor() {
  const actor = actorActual();
  if (!actor.administrador && !actor.roles.some((r) => ['supervisor', 'encargado_carga', 'gerente'].includes(r)))
    throw new ForbiddenException('Se requiere un responsable de operaciones.');
  return actor;
}
