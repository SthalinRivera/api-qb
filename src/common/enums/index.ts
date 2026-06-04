// ==================== ENUMS PRINCIPALES ====================

export enum TipoSede {
    ORIGEN = 'origen',
    DESTINO = 'destino',
    AMBOS = 'ambos',
}

export enum EstadoAccesoUsuario {
    ACTIVO = 'activo',
    BLOQUEADO = 'bloqueado',
    PENDIENTE = 'pendiente',
}

export enum TipoLugar {
    MERCADO = 'mercado',
    ALMACEN = 'almacen',
    CALLE = 'calle',
    RAMPA = 'rampa',
    PASAJE = 'pasaje',
    CAJONERIA = 'cajoneria',
    OTRO = 'otro',
}

export enum EstadoOperacion {
    PENDIENTE = 'pendiente',
    EN_CURSO = 'en_curso',
    EN_TRANSITO = 'en_transito',
    REPARTIENDO = 'repartiendo',
    COMPLETADO = 'completado',
    CANCELADO = 'cancelado',
}

export enum Seccion {
    A = 'A',
    B = 'B',
    C = 'C',
}

export enum EstadoGuia {
    EMITIDA = 'emitida',
    FIRMADA = 'firmada',
    ANULADA = 'anulada',
    REEMPLAZADA = 'reemplazada',
    OBSERVADA = 'observada',
}

export enum EstadoEntrega {
    PENDIENTE = 'pendiente',
    ENTREGADO_PARCIAL = 'entregado_parcial',
    ENTREGADO_TOTAL = 'entregado_total',
    RECHAZADO = 'rechazado',
    OBSERVADO = 'observado',
}

export enum TipoIncidencia {
    CAMBIO_DESTINO = 'cambio_destino',
    RECHAZO_RECEPTOR = 'rechazo_receptor',
    DIFERENCIA_CANTIDAD = 'diferencia_cantidad',
    DANO_PRODUCTO = 'daño_producto',
    PERDIDA_JABA = 'perdida_jaba',
    ACCIDENTE = 'accidente',
    OTRO = 'otro',
}

export enum EstadoIncidencia {
    ABIERTA = 'abierta',
    EN_REVISION = 'en_revision',
    RESUELTA = 'resuelta',
    CERRADA = 'cerrada',
}

export enum TipoMaterialJaba {
    MADERA = 'madera',
    PLASTICO = 'plastico',
}

export enum TipoRelacionClienteSede {
    EMISOR = 'emisor',
    RECEPTOR = 'receptor',
    AMBOS = 'ambos',
}

export enum TipoRecuperacionJaba {
    VALE = 'vale',
    RECOJO_PUESTO = 'recojo_puesto',
    RECOJO_ALMACEN = 'recojo_almacen',
    AJUSTE = 'ajuste',
    PERDIDA = 'perdida',
}

export enum TipoDevolucionJabaEmisor {
    JABAS_FISICAS = 'jabas_fisicas',
    VALE_CANJEADO = 'vale_canjeado',
    AJUSTE = 'ajuste',
    PERDIDA_ASUMIDA = 'perdida_asumida',
}

export enum EstadoJaba {
    PENDIENTE = 'pendiente',
    PARCIAL = 'parcial',
    COMPLETADO = 'completado',
    OBSERVADO = 'observado',
    ANULADO = 'anulado',
}

export enum TipoEntidadEvidencia {
    OPERACION = 'operacion',
    DETALLE_CARGA = 'detalle_carga',
    GUIA = 'guia',
    ENTREGA = 'entrega',
    INCIDENCIA = 'incidencia',
    JABA_POR_PAGAR = 'jaba_por_pagar',
    JABA_POR_COBRAR = 'jaba_por_cobrar',
    RECUPERACION_JABA = 'recuperacion_jaba',
    DEVOLUCION_JABA_EMISOR = 'devolucion_jaba_emisor',
}

// ==================== ARRAYS PARA SELECTS ====================
export const TIPOS_SEDE = Object.values(TipoSede);
export const ESTADOS_ACCESO = Object.values(EstadoAccesoUsuario);
export const TIPOS_LUGAR = Object.values(TipoLugar);
export const ESTADOS_OPERACION = Object.values(EstadoOperacion);
export const SECCIONES = Object.values(Seccion);
export const ESTADOS_GUIA = Object.values(EstadoGuia);
export const ESTADOS_ENTREGA = Object.values(EstadoEntrega);
export const TIPOS_INCIDENCIA = Object.values(TipoIncidencia);
export const ESTADOS_INCIDENCIA = Object.values(EstadoIncidencia);
export const TIPOS_MATERIAL_JABA = Object.values(TipoMaterialJaba);
export const TIPOS_RELACION_CLIENTE_SEDE = Object.values(TipoRelacionClienteSede);
export const TIPOS_RECUPERACION_JABA = Object.values(TipoRecuperacionJaba);
export const TIPOS_DEVOLUCION_JABA = Object.values(TipoDevolucionJabaEmisor);
export const ESTADOS_JABA = Object.values(EstadoJaba);
export const TIPOS_ENTIDAD_EVIDENCIA = Object.values(TipoEntidadEvidencia);