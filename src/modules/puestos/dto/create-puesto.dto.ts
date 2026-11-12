import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePuestoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id_empresa!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  id_lugar!: number;

  @ApiProperty({ example: 'Puesto 12A' })
  @IsString()
  @MaxLength(50)
  codigo_puesto!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}