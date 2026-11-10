import {
    IsInt,
    IsOptional,
    IsString,
    IsDateString,
    IsIn,
    Min,
    Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOperacionCargaDto {
    @IsOptional()
    @IsString()
    @Matches(/^\d{6}$/)
    id_ubigeo_origen?: string;
    @IsOptional()
    @IsString()
    @Matches(/^\d{6}$/)
    id_ubigeo_destino?: string;

    @IsInt()
    @Min(1)
    id_sede_origen!: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    id_sede_destino?: number;

    @IsInt()
    @Min(1)
    id_camion!: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    id_encargado_carga?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    id_repartidor_asignado?: number;

    @IsDateString()
    fecha_carga!: string; // YYYY-MM-DD

    @IsOptional()
    @IsString()
    hora_carga?: string; // HH:MM:SS

    @IsOptional()
    @IsString()
    @IsIn(['pendiente', 'en_curso', 'en_transito', 'repartiendo', 'completado'])
    estado?: string;

    @IsOptional()
    @IsString()
    observaciones?: string;
}