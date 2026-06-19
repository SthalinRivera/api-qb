import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryItemsRepartoDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_detalle_carga?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_cliente_receptor?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_puesto?: number;

    @IsOptional()
    @IsString()
    seccion?: string;
}