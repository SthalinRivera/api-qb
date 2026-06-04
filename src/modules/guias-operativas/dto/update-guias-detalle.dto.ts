import { PartialType } from '@nestjs/mapped-types';
import { CreateGuiaDetalleDto } from './create-guias-detalle.dto';

export class UpdateGuiaDetalleDto extends PartialType(CreateGuiaDetalleDto) { }