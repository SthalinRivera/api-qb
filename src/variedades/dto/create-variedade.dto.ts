import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateVariedadDto {
    @IsInt()
    id_empresa: number;

    @IsInt()
    id_fruta: number;

    @IsString()
    @MaxLength(100)
    nombre: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @IsOptional()
    @IsBoolean()
    estado?: boolean;
}