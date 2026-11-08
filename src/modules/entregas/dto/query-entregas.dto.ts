import { IsOptional, IsInt, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEntregasDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_operacion?: number;
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
