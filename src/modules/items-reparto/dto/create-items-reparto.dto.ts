import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateItemRepartoDto {
  @IsInt()
  @Min(1)
  id_detalle_carga!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  id_cliente_receptor?: number;

  @IsInt()
  @Min(1)
  id_puesto!: number;

  @IsInt()
  @Min(1)
  cantidad_asignada!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden_entrega?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  seccion?: 'A' | 'B' | 'C';
}