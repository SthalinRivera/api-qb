import { Matches } from 'class-validator';
import { IsOptional, IsString, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryReportesDto {
  @ApiPropertyOptional({ description: 'Fecha de inicio (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @ApiPropertyOptional({ description: 'Estado específico' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ description: 'Código ubigeo de seis dígitos' })
  @IsOptional()
  @Matches(/^\d{6}$/)
  id_ubigeo?: string;

  @ApiPropertyOptional({ description: 'ID de cliente' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_cliente?: number;

  @ApiPropertyOptional({ description: 'ID de fruta' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_fruta?: number;

  @ApiPropertyOptional({ description: 'ID de tipo de jaba' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_tipo_jaba?: number;

  @ApiPropertyOptional({ description: 'ID de repartidor' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_repartidor?: number;

  @ApiPropertyOptional({ description: 'ID de usuario' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_usuario?: number;

  @ApiPropertyOptional({ description: 'ID de puesto' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_puesto?: number;

  @ApiPropertyOptional({ description: 'ID de lugar operativo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_lugar?: number;

  @ApiPropertyOptional({ description: 'Tipo de incidencia' })
  @IsOptional()
  @IsString()
  tipo_incidencia?: string;

  @ApiPropertyOptional({ description: 'ID de operación de carga' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_operacion?: number;

  @ApiPropertyOptional({ description: 'ID de guía' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_guia?: number;

  @ApiPropertyOptional({ description: 'ID de entrega' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_entrega?: number;
}
