import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QueryIncidenciasDto {
    @IsOptional()
    @IsString()
    estado?: string;

    @IsOptional()
    @IsDateString()
    fecha_desde?: string;

    @IsOptional()
    @IsDateString()
    fecha_hasta?: string;

    @IsOptional()
    @IsString()
    tipo_incidencia?: string;
}
