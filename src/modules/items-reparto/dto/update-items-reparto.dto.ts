import { PartialType } from '@nestjs/mapped-types';
import { CreateItemRepartoDto } from './create-items-reparto.dto';

export class UpdateItemRepartoDto extends PartialType(CreateItemRepartoDto) { }