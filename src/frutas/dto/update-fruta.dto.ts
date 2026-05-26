import { PartialType } from '@nestjs/mapped-types';
import { CreateFrutaDto } from './create-fruta.dto';

export class UpdateFrutaDto extends PartialType(CreateFrutaDto) {}