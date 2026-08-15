export interface ReporteCargaPorFecha {
  fecha: string;
  total_operaciones: number;
  total_jabas: number;
  total_detalles: number;
  jabas_por_tipo: { tipo_jaba: string; cantidad: number }[];
  jabas_por_fruta: { fruta: string; cantidad: number }[];
}

export interface ReporteDetalleCarga {
  id_detalle_carga: number;
  operacion: { id_operacion: number; fecha_carga: string; estado: string };
  cliente_emisor: { id_cliente: number; nombres: string; apellidos?: string };
  fruta: { id_fruta: number; nombre: string };
  variedad?: { id_variedad: number; nombre: string };
  tipo_jaba: { id_tipo_jaba: number; nombre: string };
  cantidad_jabas: number;
  calidades: { nombre: string; cantidad: number; precio_unitario?: number }[];
  items_reparto_count: number;
}

export interface ReporteItemsReparto {
  id_item_reparto: number;
  detalle_carga: { id_detalle_carga: number };
  cliente_receptor?: { id_cliente: number; nombres: string; apellidos?: string };
  puesto: { id_puesto: number; numero_puesto: string };
  cantidad_asignada: number;
  seccion?: string;
  guia_asociada?: { id_guia: number; numero_guia: string; estado: string };
  detalles_calidad: { cantidad: number; precio_unitario?: number; subtotal?: number }[];
}

export interface ReporteGuias {
  resumen: {
    total_emitidas: number;
    total_firmadas: number;
    total_anuladas: number;
    total_reemplazadas: number;
    total_observadas: number;
  };
  guias: {
    id_guia: number;
    numero_guia: string;
    fecha_emision: string;
    estado: string;
    repartidor?: { nombres: string; apellidos?: string };
    puesto?: { numero_puesto: string };
    cantidad_items: number;
    entregas_realizadas: number;
  }[];
}

export interface ReporteEntregas {
  resumen: {
    total_entregas: number;
    entregadas_total: number;
    entregadas_parcial: number;
    rechazadas: number;
    observadas: number;
    pendientes: number;
    cantidad_total_entregada: number;
    cantidad_total_rechazada: number;
    jabas_cobradas: number;
    jabas_pendientes: number;
  };
  entregas: {
    id_entrega: number;
    fecha_entrega: string;
    estado_entrega: string;
    cantidad_entregada: number;
    cantidad_rechazada: number;
    firma_recibido: boolean;
    nombre_recibe?: string;
    guia: { id_guia: number; numero_guia: string };
    item_reparto: { id_item_reparto: number };
    entregador?: { nombres: string; apellidos?: string };
  }[];
}

export interface ReporteIncidencias {
  resumen: {
    total: number;
    abiertas: number;
    en_proceso: number;
    cerradas: number;
    por_tipo: { tipo: string; cantidad: number }[];
  };
  incidencias: {
    id_incidencia: number;
    fecha_incidencia: string;
    hora_incidencia?: string;
    tipo_incidencia: string;
    descripcion: string;
    estado: string;
    accion_tomada?: string;
    operacion?: { id_operacion: number; fecha_carga: string };
    guia?: { id_guia: number; numero_guia: string };
    entrega?: { id_entrega: number; fecha_entrega: string };
    usuario_reporta?: { nombres: string; apellidos?: string };
  }[];
}

export interface ReporteJabasPorPagar {
  resumen: {
    total_registros: number;
    total_original: number;
    total_pagado: number;
    total_pendiente: number;
    por_cliente: { cliente: string; pendiente: number; original: number }[];
    por_tipo_jaba: { tipo_jaba: string; pendiente: number; original: number }[];
  };
  jabas: {
    id_jaba_pagar: number;
    fecha_origen: string;
    cliente_emisor: { id_cliente: number; nombres: string; apellidos?: string };
    tipo_jaba: { id_tipo_jaba: number; nombre: string };
    cantidad_original: number;
    cantidad_pagada: number;
    saldo_pendiente: number;
    estado: string;
  }[];
}

export interface ReporteJabasPorCobrar {
  resumen: {
    total_registros: number;
    total_original: number;
    total_recuperada: number;
    total_pendiente: number;
    por_tipo_jaba: { tipo_jaba: string; pendiente: number; original: number }[];
  };
  jabas: {
    id_jaba_cobrar: number;
    fecha_origen: string;
    tipo_jaba: { id_tipo_jaba: number; nombre: string };
    cantidad_original: number;
    cantidad_recuperada: number;
    saldo_pendiente: number;
    estado: string;
    entrega: { id_entrega: number; fecha_entrega: string };
  }[];
}

export interface ReporteRecuperaciones {
  resumen: {
    total_recuperaciones: number;
    cantidad_total: number;
    por_tipo: { tipo: string; cantidad: number }[];
  };
  recuperaciones: {
    id_recuperacion: number;
    fecha_recuperacion: string;
    tipo_recuperacion: string;
    cantidad: number;
    jaba_cobrar: { id_jaba_cobrar: number; fecha_origen: string };
    usuario_responsable?: { nombres: string; apellidos?: string };
  }[];
}

export interface ReporteDevoluciones {
  resumen: {
    total_devoluciones: number;
    cantidad_total: number;
    por_tipo: { tipo: string; cantidad: number }[];
  };
  devoluciones: {
    id_devolucion: number;
    fecha_devolucion: string;
    tipo_devolucion: string;
    cantidad: number;
    jaba_pagar: { id_jaba_pagar: number; fecha_origen: string };
    usuario_responsable?: { nombres: string; apellidos?: string };
  }[];
}

export interface ReporteClientesPorSede {
  sede: { id_sede: number; nombre: string; ciudad?: string };
  total_clientes: number;
  clientes: {
    id_cliente: number;
    nombres: string;
    apellidos?: string;
    tipo_relacion: string;
    puestos_asignados: { numero_puesto: string; lugar: string; seccion?: string }[];
  }[];
}

export interface ReporteClientesPorPuesto {
  puesto: { id_puesto: number; numero_puesto: string; lugar: string; sede: string };
  total_clientes: number;
  clientes: {
    id_cliente: number;
    nombres: string;
    apellidos?: string;
    fecha_inicio: string;
    seccion?: string;
    estado: boolean;
  }[];
}

export interface ReporteHistorialAsignacionPuestos {
  total_asignaciones: number;
  asignaciones: {
    id_cliente_puesto: number;
    fecha_inicio: string;
    fecha_fin?: string;
    estado: boolean;
    seccion?: string;
    cliente: { id_cliente: number; nombres: string; apellidos?: string };
    puesto: { id_puesto: number; numero_puesto: string; lugar: string };
  }[];
}

export interface ReporteInventario {
  frutas: {
    id_fruta: number;
    nombre: string;
    estado: boolean;
    total_variedades: number;
    total_detalles_carga: number;
    total_jabas: number;
  }[];
  variedades: {
    id_variedad: number;
    nombre: string;
    fruta: string;
    estado: boolean;
    total_detalles_carga: number;
    total_jabas: number;
  }[];
  calidades: {
    id_calidad: number;
    nombre: string;
    estado: boolean;
    total_usos: number;
    cantidad_total: number;
    monto_total: number;
  }[];
  tipos_jaba: {
    id_tipo_jaba: number;
    nombre: string;
    tipo_material?: string;
    estado: boolean;
    total_cargas: number;
    total_jabas: number;
    jabas_por_cobrar: number;
    jabas_por_pagar: number;
  }[];
}

export interface ReporteUsuariosRoles {
  resumen: {
    total_usuarios: number;
    usuarios_activos: number;
    usuarios_inactivos: number;
    por_rol: { rol: string; cantidad: number }[];
  };
  usuarios: {
    id_usuario: number;
    nombres: string;
    apellidos?: string;
    email: string;
    estado: boolean;
    sede: string;
    roles: string[];
    total_operaciones: number;
    total_entregas: number;
    total_logs: number;
  }[];
}

export interface ReporteActividadUsuarios {
  resumen: {
    total_logs: number;
    por_usuario: { usuario: string; total: number }[];
    por_accion: { accion: string; total: number }[];
    por_tabla: { tabla: string; total: number }[];
  };
  logs: {
    id_log: number;
    accion: string;
    tabla_afectada?: string;
    id_registro?: string;
    created_at: string;
    usuario?: { id_usuario: number; nombres: string; apellidos?: string };
  }[];
}

export interface ReporteModulosPorRol {
  roles: {
    id_rol_usuario: number;
    nombre: string;
    descripcion?: string;
    total_modulos: number;
    modulos: {
      id_modulo: number;
      nombre: string;
      ruta: string;
      categoria: string;
    }[];
  }[];
}
