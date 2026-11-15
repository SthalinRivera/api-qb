import { PartialType } from '@nestjs/mapped-types';
import { CreateOperacionCargaDto } from './create-operaciones-carga.dto';

export class UpdateOperacionCargaDto extends PartialType(CreateOperacionCargaDto, { skipNullProperties: false }) { }
