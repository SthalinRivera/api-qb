import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateSeccionDto {
  @IsInt()
  id_puesto: number;

  @IsString()
  @MaxLength(100)
  nombre_seccion: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}