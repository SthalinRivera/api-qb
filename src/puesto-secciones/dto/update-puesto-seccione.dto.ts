import { PartialType } from '@nestjs/mapped-types';
import { CreateSeccionDto } from './create-puesto-seccione.dto';

export class UpdateSeccionDto extends PartialType(CreateSeccionDto) {}