// Generado por scripts/generate-tenant-relations.cjs. No editar a mano.
export const tenantRelations: Record<string, { name: string; type: string; from: string[]; to: string[] }[]> = {
  "calidades": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    }
  ],
  "camiones": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    }
  ],
  "clientes": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    }
  ],
  "clientes_puestos": [
    {
      "name": "clientes",
      "type": "clientes",
      "from": [
        "id_cliente"
      ],
      "to": [
        "id_cliente"
      ]
    },
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "puestos",
      "type": "puestos",
      "from": [
        "id_puesto"
      ],
      "to": [
        "id_puesto"
      ]
    },
    {
      "name": "clientes_clientes_puestos_id_empresa_id_clienteToclientes",
      "type": "clientes",
      "from": [
        "id_empresa",
        "id_cliente"
      ],
      "to": [
        "id_empresa",
        "id_cliente"
      ]
    }
  ],
  "detalle_carga": [
    {
      "name": "clientes",
      "type": "clientes",
      "from": [
        "id_cliente_emisor"
      ],
      "to": [
        "id_cliente"
      ]
    },
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "frutas",
      "type": "frutas",
      "from": [
        "id_fruta"
      ],
      "to": [
        "id_fruta"
      ]
    },
    {
      "name": "operaciones_carga",
      "type": "operaciones_carga",
      "from": [
        "id_operacion"
      ],
      "to": [
        "id_operacion"
      ]
    },
    {
      "name": "tipos_jaba",
      "type": "tipos_jaba",
      "from": [
        "id_tipo_jaba"
      ],
      "to": [
        "id_tipo_jaba"
      ]
    },
    {
      "name": "variedades",
      "type": "variedades",
      "from": [
        "id_variedad"
      ],
      "to": [
        "id_variedad"
      ]
    },
    {
      "name": "clientes_detalle_carga_id_empresa_id_cliente_emisorToclientes",
      "type": "clientes",
      "from": [
        "id_empresa",
        "id_cliente_emisor"
      ],
      "to": [
        "id_empresa",
        "id_cliente"
      ]
    },
    {
      "name": "frutas_detalle_carga_id_empresa_id_frutaTofrutas",
      "type": "frutas",
      "from": [
        "id_empresa",
        "id_fruta"
      ],
      "to": [
        "id_empresa",
        "id_fruta"
      ]
    },
    {
      "name": "operaciones_carga_detalle_carga_id_empresa_id_operacionTooperaciones_carga",
      "type": "operaciones_carga",
      "from": [
        "id_empresa",
        "id_operacion"
      ],
      "to": [
        "id_empresa",
        "id_operacion"
      ]
    }
  ],
  "detalle_carga_calidades": [
    {
      "name": "calidades",
      "type": "calidades",
      "from": [
        "id_calidad"
      ],
      "to": [
        "id_calidad"
      ]
    },
    {
      "name": "detalle_carga",
      "type": "detalle_carga",
      "from": [
        "id_detalle_carga"
      ],
      "to": [
        "id_detalle_carga"
      ]
    },
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    }
  ],
  "devoluciones_jabas_emisor": [
    {
      "name": "recuperaciones_jabas",
      "type": "recuperaciones_jabas",
      "from": [
        "id_recuperacion"
      ],
      "to": [
        "id_recuperacion"
      ]
    },
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "jabas_por_pagar",
      "type": "jabas_por_pagar",
      "from": [
        "id_jaba_pagar"
      ],
      "to": [
        "id_jaba_pagar"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "id_usuario_responsable"
      ],
      "to": [
        "id_usuario"
      ]
    }
  ],
  "empresas": [],
  "entregas": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "id_entregador"
      ],
      "to": [
        "id_usuario"
      ]
    },
    {
      "name": "guias_operativas",
      "type": "guias_operativas",
      "from": [
        "id_guia"
      ],
      "to": [
        "id_guia"
      ]
    },
    {
      "name": "items_reparto",
      "type": "items_reparto",
      "from": [
        "id_item_reparto"
      ],
      "to": [
        "id_item_reparto"
      ]
    }
  ],
  "evidencias": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "subido_por"
      ],
      "to": [
        "id_usuario"
      ]
    }
  ],
  "frutas": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    }
  ],
  "guias_operativas": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "items_reparto",
      "type": "items_reparto",
      "from": [
        "id_item_reparto"
      ],
      "to": [
        "id_item_reparto"
      ]
    },
    {
      "name": "puestos",
      "type": "puestos",
      "from": [
        "id_puesto"
      ],
      "to": [
        "id_puesto"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "id_repartidor"
      ],
      "to": [
        "id_usuario"
      ]
    }
  ],
  "incidencias": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "entregas",
      "type": "entregas",
      "from": [
        "id_entrega"
      ],
      "to": [
        "id_entrega"
      ]
    },
    {
      "name": "guias_operativas",
      "type": "guias_operativas",
      "from": [
        "id_guia"
      ],
      "to": [
        "id_guia"
      ]
    },
    {
      "name": "operaciones_carga",
      "type": "operaciones_carga",
      "from": [
        "id_operacion"
      ],
      "to": [
        "id_operacion"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "id_usuario_reporta"
      ],
      "to": [
        "id_usuario"
      ]
    }
  ],
  "items_reparto": [
    {
      "name": "clientes",
      "type": "clientes",
      "from": [
        "id_cliente_receptor"
      ],
      "to": [
        "id_cliente"
      ]
    },
    {
      "name": "detalle_carga",
      "type": "detalle_carga",
      "from": [
        "id_detalle_carga"
      ],
      "to": [
        "id_detalle_carga"
      ]
    },
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "puestos",
      "type": "puestos",
      "from": [
        "id_puesto"
      ],
      "to": [
        "id_puesto"
      ]
    }
  ],
  "jabas_por_cobrar": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "entregas",
      "type": "entregas",
      "from": [
        "id_entrega"
      ],
      "to": [
        "id_entrega"
      ]
    },
    {
      "name": "tipos_jaba",
      "type": "tipos_jaba",
      "from": [
        "id_tipo_jaba"
      ],
      "to": [
        "id_tipo_jaba"
      ]
    }
  ],
  "jabas_por_pagar": [
    {
      "name": "clientes",
      "type": "clientes",
      "from": [
        "id_cliente_emisor"
      ],
      "to": [
        "id_cliente"
      ]
    },
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "tipos_jaba",
      "type": "tipos_jaba",
      "from": [
        "id_tipo_jaba"
      ],
      "to": [
        "id_tipo_jaba"
      ]
    },
    {
      "name": "entregas",
      "type": "entregas",
      "from": [
        "id_entrega"
      ],
      "to": [
        "id_entrega"
      ]
    }
  ],
  "logs_actividad": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "id_usuario"
      ],
      "to": [
        "id_usuario"
      ]
    }
  ],
  "lugares_operativos": [
    {
      "name": "distritos",
      "type": "distritos",
      "from": [
        "id_ubigeo"
      ],
      "to": [
        "id_ubigeo"
      ]
    }
  ],
  "operaciones_carga": [
    {
      "name": "camiones",
      "type": "camiones",
      "from": [
        "id_camion"
      ],
      "to": [
        "id_camion"
      ]
    },
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "usuarios_operaciones_carga_id_encargado_cargaTousuarios",
      "type": "usuarios",
      "from": [
        "id_encargado_carga"
      ],
      "to": [
        "id_usuario"
      ]
    },
    {
      "name": "usuarios_operaciones_carga_id_repartidor_asignadoTousuarios",
      "type": "usuarios",
      "from": [
        "id_repartidor_asignado"
      ],
      "to": [
        "id_usuario"
      ]
    },
    {
      "name": "distritos_operaciones_carga_id_ubigeo_destinoTodistritos",
      "type": "distritos",
      "from": [
        "id_ubigeo_destino"
      ],
      "to": [
        "id_ubigeo"
      ]
    },
    {
      "name": "distritos_operaciones_carga_id_ubigeo_origenTodistritos",
      "type": "distritos",
      "from": [
        "id_ubigeo_origen"
      ],
      "to": [
        "id_ubigeo"
      ]
    }
  ],
  "puestos": [
    {
      "name": "lugares_operativos",
      "type": "lugares_operativos",
      "from": [
        "id_lugar"
      ],
      "to": [
        "id_lugar"
      ]
    }
  ],
  "recuperaciones_jabas": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "jabas_por_cobrar",
      "type": "jabas_por_cobrar",
      "from": [
        "id_jaba_cobrar"
      ],
      "to": [
        "id_jaba_cobrar"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "id_usuario_responsable"
      ],
      "to": [
        "id_usuario"
      ]
    }
  ],
  "roles_usuarios": [],
  "tipos_jaba": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    }
  ],
  "usuarios": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "distritos",
      "type": "distritos",
      "from": [
        "id_ubigeo"
      ],
      "to": [
        "id_ubigeo"
      ]
    }
  ],
  "usuarios_roles": [
    {
      "name": "roles_usuarios",
      "type": "roles_usuarios",
      "from": [
        "id_rol_usuario"
      ],
      "to": [
        "id_rol_usuario"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "id_usuario"
      ],
      "to": [
        "id_usuario"
      ]
    }
  ],
  "variedades": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "frutas",
      "type": "frutas",
      "from": [
        "id_fruta"
      ],
      "to": [
        "id_fruta"
      ]
    }
  ],
  "items_reparto_detalle": [
    {
      "name": "detalle_carga_calidades",
      "type": "detalle_carga_calidades",
      "from": [
        "id_detalle_carga_calidad"
      ],
      "to": [
        "id_detalle_carga_calidad"
      ]
    },
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "items_reparto",
      "type": "items_reparto",
      "from": [
        "id_item_reparto"
      ],
      "to": [
        "id_item_reparto"
      ]
    }
  ],
  "categorias": [],
  "modulos": [
    {
      "name": "categorias",
      "type": "categorias",
      "from": [
        "id_categoria"
      ],
      "to": [
        "id_categoria"
      ]
    }
  ],
  "roles_modulos": [
    {
      "name": "modulos",
      "type": "modulos",
      "from": [
        "modulo_id"
      ],
      "to": [
        "id_modulo"
      ]
    },
    {
      "name": "roles_usuarios",
      "type": "roles_usuarios",
      "from": [
        "rol_id"
      ],
      "to": [
        "id_rol_usuario"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "usuario_asigno"
      ],
      "to": [
        "id_usuario"
      ]
    }
  ],
  "departamentos": [],
  "distritos": [
    {
      "name": "provincias",
      "type": "provincias",
      "from": [
        "id_provincia"
      ],
      "to": [
        "id_provincia"
      ]
    }
  ],
  "empresa_lugares": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "lugares_operativos",
      "type": "lugares_operativos",
      "from": [
        "id_lugar"
      ],
      "to": [
        "id_lugar"
      ]
    }
  ],
  "provincias": [
    {
      "name": "departamentos",
      "type": "departamentos",
      "from": [
        "id_departamento"
      ],
      "to": [
        "id_departamento"
      ]
    }
  ],
  "resoluciones_reparto": [
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "items_reparto",
      "type": "items_reparto",
      "from": [
        "id_item_reparto"
      ],
      "to": [
        "id_item_reparto"
      ]
    },
    {
      "name": "usuarios",
      "type": "usuarios",
      "from": [
        "id_usuario"
      ],
      "to": [
        "id_usuario"
      ]
    }
  ],
  "cliente_distrito": [
    {
      "name": "clientes",
      "type": "clientes",
      "from": [
        "id_cliente"
      ],
      "to": [
        "id_cliente"
      ]
    },
    {
      "name": "empresas",
      "type": "empresas",
      "from": [
        "id_empresa"
      ],
      "to": [
        "id_empresa"
      ]
    },
    {
      "name": "distritos",
      "type": "distritos",
      "from": [
        "id_ubigeo"
      ],
      "to": [
        "id_ubigeo"
      ]
    }
  ]
};
export const listRelations: Record<string, string[]> = {
  "calidades": [
    "detalle_carga_calidades"
  ],
  "camiones": [
    "operaciones_carga"
  ],
  "clientes": [
    "cliente_distrito",
    "clientes_puestos",
    "clientes_puestos_clientes_puestos_id_empresa_id_clienteToclientes",
    "detalle_carga",
    "detalle_carga_detalle_carga_id_empresa_id_cliente_emisorToclientes",
    "items_reparto",
    "jabas_por_pagar"
  ],
  "clientes_puestos": [],
  "detalle_carga": [
    "detalle_carga_calidades",
    "items_reparto"
  ],
  "detalle_carga_calidades": [
    "items_reparto_detalle"
  ],
  "devoluciones_jabas_emisor": [],
  "empresas": [
    "calidades",
    "camiones",
    "cliente_distrito",
    "clientes",
    "clientes_puestos",
    "detalle_carga",
    "detalle_carga_calidades",
    "devoluciones_jabas_emisor",
    "empresa_lugares",
    "entregas",
    "evidencias",
    "frutas",
    "guias_operativas",
    "incidencias",
    "items_reparto",
    "items_reparto_detalle",
    "jabas_por_cobrar",
    "jabas_por_pagar",
    "logs_actividad",
    "operaciones_carga",
    "recuperaciones_jabas",
    "resoluciones_reparto",
    "tipos_jaba",
    "usuarios",
    "variedades"
  ],
  "entregas": [
    "incidencias",
    "jabas_por_cobrar",
    "jabas_por_pagar"
  ],
  "evidencias": [],
  "frutas": [
    "detalle_carga",
    "detalle_carga_detalle_carga_id_empresa_id_frutaTofrutas",
    "variedades"
  ],
  "guias_operativas": [
    "entregas",
    "incidencias"
  ],
  "incidencias": [],
  "items_reparto": [
    "entregas",
    "guias_operativas",
    "items_reparto_detalle",
    "resoluciones_reparto"
  ],
  "jabas_por_cobrar": [
    "recuperaciones_jabas"
  ],
  "jabas_por_pagar": [
    "devoluciones_jabas_emisor"
  ],
  "logs_actividad": [],
  "lugares_operativos": [
    "empresa_lugares",
    "puestos"
  ],
  "operaciones_carga": [
    "detalle_carga",
    "detalle_carga_detalle_carga_id_empresa_id_operacionTooperaciones_carga",
    "incidencias"
  ],
  "puestos": [
    "clientes_puestos",
    "guias_operativas",
    "items_reparto"
  ],
  "recuperaciones_jabas": [
    "devoluciones_jabas_emisor"
  ],
  "roles_usuarios": [
    "roles_modulos",
    "usuarios_roles"
  ],
  "tipos_jaba": [
    "detalle_carga",
    "jabas_por_cobrar",
    "jabas_por_pagar"
  ],
  "usuarios": [
    "devoluciones_jabas_emisor",
    "entregas",
    "evidencias",
    "guias_operativas",
    "incidencias",
    "logs_actividad",
    "operaciones_carga_operaciones_carga_id_encargado_cargaTousuarios",
    "operaciones_carga_operaciones_carga_id_repartidor_asignadoTousuarios",
    "recuperaciones_jabas",
    "resoluciones_reparto",
    "roles_modulos",
    "usuarios_roles"
  ],
  "usuarios_roles": [],
  "variedades": [
    "detalle_carga"
  ],
  "items_reparto_detalle": [],
  "categorias": [
    "modulos"
  ],
  "modulos": [
    "roles_modulos"
  ],
  "roles_modulos": [],
  "departamentos": [
    "provincias"
  ],
  "distritos": [
    "cliente_distrito",
    "lugares_operativos",
    "operaciones_carga_operaciones_carga_id_ubigeo_destinoTodistritos",
    "operaciones_carga_operaciones_carga_id_ubigeo_origenTodistritos",
    "usuarios"
  ],
  "empresa_lugares": [],
  "provincias": [
    "distritos"
  ],
  "resoluciones_reparto": [],
  "cliente_distrito": []
};
