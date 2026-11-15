import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt, Min, Max } from 'class-validator';
export class ReordenarCargaDto {
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) @Max(Number.MAX_SAFE_INTEGER, { each: true })
  ids!: number[];
}
