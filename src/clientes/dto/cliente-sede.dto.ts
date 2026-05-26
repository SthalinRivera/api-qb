// src/clientes/dto/cliente-sede.dto.ts
import { IsInt, IsString } from 'class-validator';

export class ClienteSedeDto {
    @IsInt()
    id_cliente: number;

    @IsInt()
    id_sede: number;

    @IsString()
    tipo_relacion: string; // ej: "envío", "recolección", etc.
}