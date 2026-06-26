import { IsInt, IsPositive, IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export class CreateRecuperacionDto {
    @IsInt()
    @IsPositive()
    id_jaba_cobrar!: number;

    @IsDateString()
    fecha_recuperacion!: string;

    @IsString()
    @IsIn(['vale', 'recojo_puesto', 'recojo_almacen', 'ajuste', 'perdida'])
    tipo_recuperacion!: string;

    @IsInt()
    @IsPositive()
    cantidad!: number;

    @IsOptional()
    @IsInt()
    @IsPositive()
    id_usuario_responsable?: number;

    @IsOptional()
    @IsString()
    observaciones?: string;
}