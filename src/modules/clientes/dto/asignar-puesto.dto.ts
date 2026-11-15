import { IsInt, IsOptional, IsIn, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AsignarPuestoDto {
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER)
  @Type(() => Number)
  id_puesto!: number;

  @ApiPropertyOptional({ type: String, enum: ['A', 'B', 'C'], nullable: true, description: 'null u omitido = puesto completo; cadena vacía aceptada como alias compatible de null.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value)
  @IsOptional()
  @IsIn(['A', 'B', 'C'])
  seccion?: string | null;
}
