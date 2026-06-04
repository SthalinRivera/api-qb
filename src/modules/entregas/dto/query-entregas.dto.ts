import { IsOptional, IsInt, IsString, IsDateString } from 'class-validator';

export class QueryEntregasDto {
    @IsOptional()
    @IsInt()
    id_guia?: number;

    @IsOptional()
    @IsInt()
    id_item_reparto?: number;

    @IsOptional()
    @IsDateString()
    fecha_entrega?: string;

    @IsOptional()
    @IsString()
    estado_entrega?: string;
}