import { PartialType } from '@nestjs/mapped-types';
import { CreateEntregaDto } from './create-entregas.dto';

export class UpdateEntregaDto extends PartialType(CreateEntregaDto) { }
