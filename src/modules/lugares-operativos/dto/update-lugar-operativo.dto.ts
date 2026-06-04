import { PartialType } from '@nestjs/mapped-types';
import { CreateLugarOperativoDto } from './create-lugar-operativo.dto';

export class UpdateLugarOperativoDto extends PartialType(CreateLugarOperativoDto) { }