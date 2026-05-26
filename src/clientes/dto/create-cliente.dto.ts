// src/clientes/dto/create-cliente.dto.ts
import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength, IsPhoneNumber } from 'class-validator';

export class CreateClienteDto {
  @IsInt()
  id_empresa: number;

  @IsString()
  @MaxLength(100)
  nombres: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsString()
  apodo?: string;

  @IsOptional()
  @IsPhoneNumber('PE') // o simplemente @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}