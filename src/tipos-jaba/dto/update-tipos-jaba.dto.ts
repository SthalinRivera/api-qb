import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoJabaDto } from './create-tipos-jaba.dto';

export class UpdateTipoJabaDto extends PartialType(CreateTipoJabaDto) { }