import { IsOptional, IsInt, IsString, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryGuiasOperativasDto {
    @IsOptional()
    @IsString()
    estado?: string;

    @IsOptional()
    @IsDateString()
    fecha_emision?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_repartidor?: number;

    @IsOptional() @Type(() => Number) @IsInt() @Min(1)
    page: number = 1;

    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
    limit: number = 20;
}
