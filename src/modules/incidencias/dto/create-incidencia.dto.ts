import { IsString, IsOptional, IsDateString, IsNumber, IsIn, IsNotEmpty } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateIncidenciaDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    id_empresa?: number;

    // ✅ Cambiamos @IsDateString() por @IsString() + @IsNotEmpty()
    @IsString()
    @IsNotEmpty()
    fecha_incidencia!: string; // <-- string, no Date

    @IsOptional()
    @IsString()
    hora_incidencia?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    id_operacion?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    id_guia?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    id_entrega?: number;

    @IsString()
    @IsIn([
        'cambio_destino',
        'rechazo_receptor',
        'diferencia_cantidad',
        'daño_producto',
        'perdida_jaba',
        'accidente',
        'otro',
    ])
    tipo_incidencia!: string;

    @IsString()
    descripcion!: string;

    @IsOptional()
    @IsString()
    accion_tomada?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    id_usuario_reporta?: number;

    @IsOptional()
    @IsString()
    @IsIn(['abierta', 'cerrada'])
    estado?: string;
}