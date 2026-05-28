import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateCamionDto {
    @IsInt()
    id_empresa: number;

    @IsString()
    @MaxLength(20)
    placa: string;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @IsOptional()
    @IsBoolean()
    estado?: boolean;
}