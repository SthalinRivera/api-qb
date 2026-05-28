import { PartialType } from '@nestjs/mapped-types';
import { CreateCamionDto } from './create-camione.dto';

export class UpdateCamionDto extends PartialType(CreateCamionDto) { }