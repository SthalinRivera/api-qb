// src/clientes/dto/asignar-puesto.dto.ts
import { IsInt, IsOptional } from 'class-validator';

export class AsignarPuestoDto {
  @IsInt()
  id_puesto: number;

  @IsOptional()
  fecha_inicio?: Date; // opcional, se usará CURRENT_DATE por defecto
}