import { IsInt, Min, IsDecimal, IsOptional } from 'class-validator';

export class CreateDetalleCalidadDto {
    @IsInt()
    @Min(1)
    id_calidad!: number;

    @IsInt()
    @Min(1)
    cantidad!: number;

    @IsOptional()
    @IsDecimal()
    precio_unitario?: number;
}