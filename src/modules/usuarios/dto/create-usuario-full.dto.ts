import { Matches } from 'class-validator';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsBoolean, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFullUsuarioDto {
    @IsString()
    @IsNotEmpty()
    nombres!: string;

    @IsString()
    @IsOptional()
    apellidos?: string;

    @IsString()
    @IsEmail()
    email!: string;

    @IsString()
    @IsOptional()
    telefono?: string;

    @IsNumber()
    id_empresa!: number;

    @IsString()
    @Matches(/^\d{6}$/)
    id_ubigeo!: string;

    @IsArray()
    @IsNumber({}, { each: true })
    roles!: number[]; // IDs de roles a asignar

    @IsBoolean()
    @IsOptional()
    estado?: boolean;


}