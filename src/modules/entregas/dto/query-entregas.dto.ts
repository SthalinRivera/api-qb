import {
  IsOptional,
  IsInt,
  IsString,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEntregasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_operacion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_calidad?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_guia?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_item_reparto?: number;

  @IsOptional()
  @IsDateString()
  fecha_entrega?: string;

  @IsOptional()
  @IsDateString()
  fecha_carga?: string;

  @IsOptional()
  @IsString()
  estado_entrega?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
