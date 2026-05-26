// src/usuarios/dto/create-usuario.dto.ts
import { IsString, IsEmail, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class CreateUsuarioDto {
    @IsString()
    nombres: string;

    @IsOptional()
    @IsString()
    apellidos?: string;

    @IsOptional()
    @IsString()
    telefono?: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    google_uid?: string;

    @IsOptional()
    @IsString()
    avatar_url?: string;

    @IsOptional()
    @IsString()
    estado_acceso?: string; // 'activo' | 'bloqueado' (default 'activo')

    @IsOptional()
    @IsBoolean()
    estado?: boolean; // true=activo, false=desactivado

    @IsInt()
    id_empresa: number;

    @IsOptional()
    @IsInt()
    id_sede?: number;
}