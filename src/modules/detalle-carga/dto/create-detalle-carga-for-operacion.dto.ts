import { IsInt, IsOptional, IsBoolean, IsString, Min } from 'class-validator';

export class CreateDetalleCargaForOperacionDto {
    @IsInt()
    @Min(1)
    id_cliente_emisor!: number;

    @IsInt()
    @Min(1)
    id_fruta!: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    id_variedad?: number;

    @IsInt()
    @Min(1)
    id_tipo_jaba!: number;

    @IsInt()
    @Min(1)
    cantidad_jabas!: number;

    @IsOptional()
    @IsBoolean()
    es_reparto?: boolean;

    @IsOptional()
    @IsString()
    instruccion_reparto?: string;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    id_cliente_receptor?: number;   // 👈 NUEVO


    @IsOptional()
    @IsBoolean()
    requiere_retorno_jabas?: boolean;
}