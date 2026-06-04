import { IsInt, IsOptional, IsNumber, Min, IsString } from 'class-validator';

export class CreateGuiaDetalleDto {
    @IsInt()
    @Min(1)
    id_item_reparto!: number;

    @IsInt()
    @Min(1)
    id_detalle_carga_calidad!: number;

    @IsInt()
    @Min(1)
    cantidad!: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0) s
    precio_unitario?: number;

    @IsOptional()
    @IsString()
    observaciones?: string;
}