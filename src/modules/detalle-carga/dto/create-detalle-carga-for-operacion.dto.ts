// dto/create-detalle-carga-for-operacion.dto.ts
import { IsInt, IsOptional, IsString, IsBoolean, Min } from 'class-validator';

export class CreateDetalleCargaForOperacionDto {
    @IsInt()
    id_cliente_emisor!: number;

    @IsInt()
    id_fruta!: number;

    @IsInt()
    @IsOptional()
    id_variedad?: number | null;

    @IsInt()
    id_tipo_jaba!: number;

    @IsInt()
    @Min(1)
    cantidad_jabas!: number;

    @IsBoolean()
    @IsOptional()
    es_reparto?: boolean;

    @IsString()
    @IsOptional()
    instruccion_reparto?: string;

    @IsString()
    @IsOptional()
    observaciones?: string;

    @IsBoolean()
    @IsOptional()
    requiere_retorno_jabas?: boolean;

    // ✅ Nuevos campos para entrega manual
    @IsInt()
    @IsOptional()
    id_cliente_receptor?: number | null;

    @IsInt()
    @IsOptional()
    id_puesto?: number | null;

    @IsString()
    @IsOptional()
    id_seccion?: string | null;
}