import { IsInt, IsEnum } from 'class-validator';
import { TipoRelacionClienteSede } from '../../../common/enums';

export class ClienteSedeDto {
    @IsInt()
    id_cliente!: number;

    @IsInt()
    id_sede!: number;

    @IsEnum(TipoRelacionClienteSede)
    tipo_relacion!: TipoRelacionClienteSede;
}