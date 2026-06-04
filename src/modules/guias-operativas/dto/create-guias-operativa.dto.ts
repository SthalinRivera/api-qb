import { IsInt, IsOptional, IsString, IsDateString, Min } from 'class-validator';

export class CreateGuiaOperativaDto {
  @IsString()
  numero_guia!: string;

  @IsDateString()
  fecha_emision!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  id_repartidor?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsInt()
  @Min(1)
  id_item_reparto!: number;

  @IsOptional()
  @IsString()
  estado?: string; // 'emitida' por defecto
}