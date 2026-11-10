import { Matches } from 'class-validator';
import { IsString, IsInt, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoLugar } from '../../../common/enums';

export class CreateLugarOperativoDto {
  @IsOptional() @IsString() @Matches(/^\d{6}$/) id_ubigeo?: string;
  @ApiProperty({ example: 1 })
  @IsInt()
  id_empresa!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  id_sede!: number;

  @ApiProperty({ example: 'Mercado Central' })
  @IsString()
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  direccion_referencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;

  @ApiProperty({ enum: TipoLugar, default: TipoLugar.MERCADO })
  @IsEnum(TipoLugar)
  tipo_lugar!: TipoLugar;
}