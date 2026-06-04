import { IsInt, IsOptional, IsString, IsDateString, Min, Max, IsBoolean } from 'class-validator';

export class CreateEntregaDto {
  @IsInt()
  @Min(1)
  id_guia!: number;

  @IsInt()
  @Min(1)
  id_item_reparto!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  id_entregador?: number;

  @IsDateString()
  fecha_entrega!: string;

  @IsOptional()
  @IsString()
  hora_entrega?: string;

  @IsInt()
  @Min(0)
  cantidad_entregada!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantidad_rechazada?: number;

  @IsString()
  estado_entrega!: string; // pendiente, entregado_parcial, entregado_total, rechazado, observado

  @IsOptional()
  @IsBoolean()
  firma_recibido?: boolean;

  @IsOptional()
  @IsString()
  nombre_recibe?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}