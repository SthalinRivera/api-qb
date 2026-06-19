import { IsInt, IsOptional, IsNumber, Min, IsPositive } from 'class-validator';

export class CreateItemsRepartoDetalleDto {
    @IsInt()
    id_detalle_carga_calidad!: number;

    @IsInt()
    @Min(1)
    cantidad!: number;

    @IsOptional()
    @IsNumber()
    precio_unitario?: number;
}