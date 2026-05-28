import { IsString, IsOptional, IsBoolean, IsInt, IsIn } from 'class-validator';

export class CreateSedeDto {
    @IsInt()
    id_empresa: number;

    @IsString()
    nombre: string;

    @IsOptional()
    @IsString()
    @IsIn(['origen', 'destino', 'ambos'])
    tipo_sede?: string;

    @IsOptional()
    @IsString()
    direccion?: string;

    @IsOptional()
    @IsString()
    ciudad?: string;

    @IsOptional()
    @IsString()
    departamento?: string;

    @IsOptional()
    @IsBoolean()
    estado?: boolean;
}