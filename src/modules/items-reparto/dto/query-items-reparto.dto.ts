import { IsOptional, IsInt, IsString } from 'class-validator';

export class QueryItemsRepartoDto {
    @IsOptional()
    @IsInt()
    id_detalle_carga?: number;

    @IsOptional()
    @IsInt()
    id_cliente_receptor?: number;

    @IsOptional()
    @IsInt()
    id_puesto?: number;

    @IsOptional()
    @IsString()
    seccion?: string;
}