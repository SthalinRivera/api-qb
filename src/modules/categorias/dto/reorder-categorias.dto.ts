import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ReorderItem {
    @ApiProperty()
    @IsNumber()
    id_categoria: number;

    @ApiProperty()
    @IsNumber()
    orden: number;
}

export class ReorderCategoriasDto {
    @ApiProperty({ type: [ReorderItem] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReorderItem)
    items: ReorderItem[];
}
