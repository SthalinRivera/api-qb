import { IsIn, IsInt, Min, IsString, MinLength, MaxLength, IsUUID } from 'class-validator';
export class ResolucionRepartoDto {
  @IsIn(['devolucion','merma']) tipo!: string;
  @IsInt() @Min(1) cantidad!: number;
  @IsString() @MinLength(5) @MaxLength(1000) motivo!: string;
  @IsUUID() clave_idempotencia!: string;
}
