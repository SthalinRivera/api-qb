import { BadRequestException } from '@nestjs/common';

export function validarEntrega(
  cantidad: number,
  rechazada: number,
  estado: string,
  disponible: number,
  nombre?: string | null,
) {
  if (
    !Number.isInteger(cantidad) ||
    cantidad < 0 ||
    !Number.isInteger(rechazada) ||
    rechazada < 0
  )
    throw new BadRequestException(
      'Las cantidades deben ser números enteros mayores o iguales a cero.',
    );
  if (disponible <= 0)
    throw new BadRequestException('Esta entrega ya está completa.');
  if (cantidad + rechazada > disponible)
    throw new BadRequestException(
      `Solo quedan ${disponible} jabas por entregar.`,
    );
  if (
    ![
      'pendiente',
      'entregado_parcial',
      'entregado_total',
      'rechazado',
      'observado',
    ].includes(estado)
  )
    throw new BadRequestException('Selecciona un estado de entrega válido.');
  if (estado === 'pendiente' && (cantidad || rechazada))
    throw new BadRequestException(
      'Una entrega pendiente no puede tener cantidades recibidas o rechazadas.',
    );
  if (estado !== 'pendiente' && cantidad + rechazada === 0)
    throw new BadRequestException('Indica la cantidad recibida o rechazada.');
  if (
    estado === 'entregado_total' &&
    (cantidad !== disponible || rechazada > 0)
  )
    throw new BadRequestException(
      'Para completar la entrega debes registrar todas las jabas pendientes sin rechazos.',
    );
  if (
    estado === 'entregado_parcial' &&
    (cantidad <= 0 || cantidad >= disponible)
  )
    throw new BadRequestException(
      'Una entrega parcial debe ser mayor a cero y menor al saldo pendiente.',
    );
  if (estado === 'rechazado' && (cantidad !== 0 || rechazada <= 0))
    throw new BadRequestException(
      'Una entrega rechazada debe indicar jabas rechazadas y ninguna recibida.',
    );
  if (cantidad > 0 && !nombre?.trim())
    throw new BadRequestException(
      'Escribe el nombre de la persona que recibe.',
    );
}
