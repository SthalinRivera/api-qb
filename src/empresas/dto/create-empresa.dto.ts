// src/empresas/dto/create-empresa.dto.ts
import { IsString, IsOptional, IsBoolean, Length, IsNotEmpty } from 'class-validator';

export class CreateEmpresaDto {
    @IsString()
    @IsNotEmpty({ message: 'La razón social es obligatoria' })
    razon_social: string;

    @IsString()
    @IsNotEmpty({ message: 'El nombre comercial es obligatorio' })
    nombre_comercial: string;

    @IsOptional()
    @IsString()
    @Length(11, 11, { message: 'El RUC debe tener 11 dígitos' }) // ejemplo para Perú
    ruc?: string;

    @IsOptional()
    @IsString()
    telefono?: string;

    @IsOptional()
    @IsString()
    direccion?: string;

    @IsOptional()
    @IsBoolean()
    estado?: boolean;
}