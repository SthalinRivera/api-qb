import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

class ReorderModuloItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_modulo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  orden!: number;
}

export class ReorderModulosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderModuloItemDto)
  items!: ReorderModuloItemDto[];
}
