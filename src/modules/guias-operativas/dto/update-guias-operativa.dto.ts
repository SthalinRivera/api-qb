import { PartialType } from '@nestjs/mapped-types';
import { CreateGuiaOperativaDto } from './create-guias-operativa.dto';

export class UpdateGuiaOperativaDto extends PartialType(CreateGuiaOperativaDto) {}