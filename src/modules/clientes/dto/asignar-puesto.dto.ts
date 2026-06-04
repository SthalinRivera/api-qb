import { IsInt, IsOptional, IsString, IsIn } from 'class-validator';

export class AsignarPuestoDto {
  @IsInt()
  id_puesto!: number;

  @IsOptional()
  @IsString()
  @IsIn(['A', 'B', 'C'], { message: 'Sección debe ser A, B o C' })
  seccion?: 'A' | 'B' | 'C';
}