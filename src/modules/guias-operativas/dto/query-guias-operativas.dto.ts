import { IsOptional, IsInt, IsString, IsDateString } from 'class-validator';

export class QueryGuiasOperativasDto {
    @IsOptional()
    @IsString()
    estado?: string;

    @IsOptional()
    @IsDateString()
    fecha_emision?: string;

    @IsOptional()
    @IsInt()
    id_repartidor?: number;
}