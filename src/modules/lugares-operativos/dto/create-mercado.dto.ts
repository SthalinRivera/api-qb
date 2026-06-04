import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateMercadoDto {
  @IsInt()
  id_empresa: number;

  @IsInt()
  id_sede: number;

  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  direccion_referencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}