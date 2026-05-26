import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateTipoJabaDto {
    @IsInt()
    id_empresa: number;

    @IsString()
    @MaxLength(100)
    nombre: string;

    @IsOptional()
    @IsString()
    tipo_material?: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @IsOptional()
    @IsBoolean()
    estado?: boolean;
}