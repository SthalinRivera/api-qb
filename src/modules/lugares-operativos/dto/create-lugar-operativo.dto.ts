import { IsString, IsInt, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { TipoLugar } from '../../../common/enums';

export class CreateLugarOperativoDto {
  @IsInt()
  id_empresa!: number;

  @IsInt()
  id_sede!: number;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  direccion_referencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;

  @IsEnum(TipoLugar)
  tipo_lugar: TipoLugar = TipoLugar.MERCADO;
}