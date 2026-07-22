import { IsNumber, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignModulosDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    rol_id!: number;

    @ApiProperty({ example: [1, 2, 3] })
    @IsArray()
    @IsNumber({}, { each: true })
    modulo_ids!: number[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    usuario_asigno?: number;
}

export class ToggleModuloDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    usuario_asigno?: number;
}
