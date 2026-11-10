import { IsString } from 'class-validator';
import { IsOptional } from 'class-validator';
import { Matches } from 'class-validator';
import { IsInt, IsEnum } from 'class-validator';
import { TipoRelacionClienteSede } from '../../../common/enums';

export class ClienteSedeDto {
  @IsOptional() @IsString() @Matches(/^\d{6}$/) id_ubigeo?: string;

    @IsInt()
    id_cliente!: number;

    @IsInt()
    id_sede!: number;

    @IsEnum(TipoRelacionClienteSede)
    tipo_relacion!: TipoRelacionClienteSede;
}