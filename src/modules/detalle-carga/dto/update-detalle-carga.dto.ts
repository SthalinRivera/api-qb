import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateDetalleCargaDto } from './create-detalle-carga.dto';

export class UpdateDetalleCargaDto extends PartialType(CreateDetalleCargaDto) {
  @IsOptional() @IsInt() @Min(1) id_cliente_receptor?: number;
  @IsOptional() @IsInt() @Min(1) id_puesto?: number;
  @IsOptional() @IsString() id_seccion?: string;
}