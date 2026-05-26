import { PartialType } from '@nestjs/mapped-types';
import { CreateCalidadDto } from './create-calidade.dto';

export class UpdateCalidadDto extends PartialType(CreateCalidadDto) { }