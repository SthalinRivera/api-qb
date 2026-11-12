import { IsString } from 'class-validator';
import { IsOptional } from 'class-validator';
import { Matches } from 'class-validator';
import { IsInt, IsEnum } from 'class-validator';
import { TipoRelacionClienteUbicacion } from '../../../common/enums';

export class ClienteUbicacionDto {
  @IsString() @Matches(/^\d{6}$/) id_ubigeo!: string;

    @IsInt()
    id_cliente!: number;

    @IsEnum(TipoRelacionClienteUbicacion)
    tipo_relacion!: TipoRelacionClienteUbicacion;
}