// src/roles-usuarios/dto/create-rol.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateRolDto {
    @IsString()
    nombre: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @IsOptional()
    @IsBoolean()
    estado?: boolean;
}