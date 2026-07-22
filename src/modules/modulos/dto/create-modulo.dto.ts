import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModuloDto {
    @ApiProperty({ example: 'Empresas' })
    @IsString()
    @MaxLength(100)
    nombre!: string;

    @ApiProperty({ example: '/dashboard/empresas' })
    @IsString()
    @MaxLength(255)
    ruta!: string;

    @ApiProperty({ example: 1 })
    @IsNumber()
    id_categoria!: number;

    @ApiProperty({ default: 0, required: false })
    @IsOptional()
    @IsNumber()
    orden?: number;

    @ApiProperty({ default: true, required: false })
    @IsOptional()
    @IsBoolean()
    estado?: boolean;
}
