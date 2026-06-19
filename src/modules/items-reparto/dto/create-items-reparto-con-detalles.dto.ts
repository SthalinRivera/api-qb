import { IsInt, IsOptional, IsArray, ValidateNested, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleCalidadDto {
    @IsInt()
    id_detalle_carga_calidad!: number;

    @IsInt()
    @Min(1)
    cantidad!: number;

    @IsOptional()
    @IsNumber()
    precio_unitario?: number;
}

export class CreateItemRepartoConDetallesDto {
    @IsInt()
    id_detalle_carga!: number;

    @IsInt()
    id_cliente_receptor!: number;

    @IsInt()
    id_puesto!: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DetalleCalidadDto)
    detalles!: DetalleCalidadDto[];

    @IsOptional()
    @IsInt()
    @Min(1)
    orden_entrega?: number;

    @IsOptional()
    observaciones?: string;

    @IsOptional()
    seccion?: string;
}