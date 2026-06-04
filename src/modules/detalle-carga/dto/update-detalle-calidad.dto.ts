import { PartialType } from '@nestjs/mapped-types';
import { CreateDetalleCalidadDto } from './create-detalle-calidad.dto';

export class UpdateDetalleCalidadDto extends PartialType(CreateDetalleCalidadDto) { }