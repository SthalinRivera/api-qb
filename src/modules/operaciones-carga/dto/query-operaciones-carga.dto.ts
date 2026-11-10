import { IsOptional, IsIn, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ESTADOS_OPERACION } from '../estados-operacion';
export class QueryOperacionesCargaDto {
  @IsOptional() @IsIn(ESTADOS_OPERACION) estado?: string;
  @IsOptional() @IsDateString() fecha?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}
