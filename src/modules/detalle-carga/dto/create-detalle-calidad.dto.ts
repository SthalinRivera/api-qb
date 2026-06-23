import { Type } from 'class-transformer';
import { IsInt, Min, IsDecimal, IsOptional, IsNumber } from 'class-validator';

export class CreateDetalleCalidadDto {
    @IsInt()
    @Min(1)
    id_calidad!: number;

    @IsInt()
    @Min(1)
    cantidad!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    precio_unitario?: number;
}