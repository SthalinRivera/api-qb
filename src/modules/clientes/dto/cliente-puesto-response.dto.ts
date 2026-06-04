export class ClientePuestoResponseDto {
    id_cliente_puesto!: number;
    cliente!: {
        id_cliente: number;
        nombres: string;
        apellidos: string;
        telefono: string;
    };
    puesto!: {
        id_puesto: number;
        numero_puesto: string;
        mercado: string;
        sede: string;
    };
    fecha_inicio!: Date;
    fecha_fin!: Date | null;
    estado!: boolean;
    seccion!: string | null;
}