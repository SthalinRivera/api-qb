import {
    IsInt,
    IsOptional,
    IsString,
    IsDateString,
    IsIn,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOperacionCargaDto {
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
    @IsIn(['pendiente', 'en_curso', 'en_transito', 'repartiendo', 'completado', 'cancelado'])
    estado?: string;

    @IsOptional()
    @IsString()
    observaciones?: string;
}