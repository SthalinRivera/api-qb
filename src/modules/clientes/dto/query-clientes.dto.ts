import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryClientesDto {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) id_sede?: number;
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    buscar?: string;

    @IsOptional()
    @IsIn(['true', 'false', 'todos'])
    estado?: string = 'todos';
    @IsOptional()
    @IsIn(['emisor', 'receptor', 'ambos', 'todos'])
    tipo_relacion?: string = 'todos';
}