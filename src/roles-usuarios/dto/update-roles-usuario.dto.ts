// src/roles-usuarios/dto/update-rol.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateRolDto } from './create-roles-usuario.dto';

export class UpdateRolDto extends PartialType(CreateRolDto) { }