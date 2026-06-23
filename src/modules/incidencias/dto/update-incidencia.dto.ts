import { PartialType } from '@nestjs/swagger';
import { CreateIncidenciaDto } from './create-incidencia.dto';

export class UpdateIncidenciaDto extends PartialType(CreateIncidenciaDto) {}
