import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoriaDto {
    @ApiProperty({ example: 'Base del sistema' })
    @IsString()
    @MaxLength(100)
    nombre!: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    descripcion?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    icono_web?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    icono_mobil?: string;

    @ApiProperty({ default: 0, required: false })
    @IsOptional()
    @IsNumber()
    orden?: number;

    @ApiProperty({ default: true, required: false })
    @IsOptional()
    @IsBoolean()
    estado?: boolean;
}
