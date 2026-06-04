import { PartialType } from '@nestjs/mapped-types';
import { CreateDetalleCargaDto } from './create-detalle-carga.dto';

export class UpdateDetalleCargaDto extends PartialType(CreateDetalleCargaDto) {}