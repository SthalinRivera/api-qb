import { IsInt, IsOptional, IsString, Min, IsPositive, IsIn } from 'class-validator';

export class CreateItemRepartoDto {
    @IsInt()
    id_detalle_carga!: number;

    @IsInt()
    id_cliente_receptor!: number;

    @IsInt()
    id_puesto!: number;

    @IsInt()
    @Min(1)
    cantidad_asignada!: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    orden_entrega?: number;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsOptional()
    @IsString()
    seccion?: string;
}