import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreatePuestoDto {
  @IsInt()
  id_empresa: number;

  @IsInt()
  id_lugar: number; // mercado al que pertenece

  @IsString()
  @MaxLength(50)
  numero_puesto: string;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}