import { IsInt, IsPositive, IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export class CreateDevolucionEmisorDto {
    @IsInt()
    @IsPositive()
    id_jaba_pagar!: number;

    @IsDateString()
    fecha_devolucion!: string;

    @IsString()
    @IsIn(['jabas_fisicas', 'vale_canjeado', 'ajuste', 'perdida_asumida'])
    tipo_devolucion!: string;

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