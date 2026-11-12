import { Matches } from 'class-validator';
import { IsOptional, IsIn, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
export class QueryPuestosDto {
  @IsOptional() @IsIn(['true','false','todos']) estado?: string;
  @IsOptional() @Matches(/^\d{6}$/) id_ubigeo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_lugar?: number;
  @IsOptional() @IsString() tipo_lugar?: string;
  @IsOptional() @IsString() buscar?: string;
}
