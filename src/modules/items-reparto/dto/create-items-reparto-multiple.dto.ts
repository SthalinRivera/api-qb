// src/modules/items-reparto/dto/create-items-reparto-multiple.dto.ts
import { IsInt, IsOptional, IsArray, ValidateNested, Min, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleCalidadAsignacionDto {
    @IsInt()
    id_detalle_carga_calidad!: number;

    @IsInt()
    @Min(1)
    cantidad!: number;

    @IsOptional()
    @IsNumber()
    precio_unitario?: number;
}

export class AsignacionClienteDto {
    @IsInt()
    id_cliente_receptor!: number;

    @IsInt()
    id_puesto!: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    orden_entrega?: number;

    @IsOptional()
    seccion?: string;

    @IsOptional()
    observaciones?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DetalleCalidadAsignacionDto)
    detalles!: DetalleCalidadAsignacionDto[];
}

export class CreateItemsRepartoMultipleDto {
    @IsInt()
    id_detalle_carga!: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AsignacionClienteDto)
    asignaciones!: AsignacionClienteDto[];
}