import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryParamsDto {
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    id_cliente?: number;

    @IsOptional()
    @IsString()
    estado?: string;

    @IsOptional()
    @IsString()
    fecha_desde?: string;

    @IsOptional()
    @IsString()
    fecha_hasta?: string;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    id_tipo_jaba?: number;
}