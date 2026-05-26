import { PartialType } from '@nestjs/mapped-types';
import { CreateVariedadDto } from './create-variedade.dto';

export class UpdateVariedadDto extends PartialType(CreateVariedadDto) { }