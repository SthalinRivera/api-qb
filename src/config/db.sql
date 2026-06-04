-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.empresas (
  id_empresa bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  razon_social text NOT NULL,
  nombre_comercial text NOT NULL,
  ruc text,
  telefono text,
  direccion text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT empresas_pkey PRIMARY KEY (id_empresa)
);
CREATE TABLE public.roles_usuarios (
  id_rol_usuario bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  descripcion text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_usuarios_pkey PRIMARY KEY (id_rol_usuario)
);
CREATE TABLE public.sedes (
  id_sede bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  nombre text NOT NULL,
  tipo_sede text CHECK (tipo_sede = ANY (ARRAY['origen'::text, 'destino'::text, 'ambos'::text])),
  direccion text,
  ciudad text,
  departamento text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sedes_pkey PRIMARY KEY (id_sede),
  CONSTRAINT sedes_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa)
);
CREATE TABLE public.usuarios (
  id_usuario bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_sede bigint NOT NULL,
  nombres text NOT NULL,
  apellidos text,
  telefono text,
  email text NOT NULL,
  google_uid text UNIQUE,
  avatar_url text,
  estado_acceso text DEFAULT 'activo'::text CHECK (estado_acceso = ANY (ARRAY['activo'::text, 'bloqueado'::text, 'pendiente'::text])),
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT usuarios_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT usuarios_id_sede_fkey FOREIGN KEY (id_sede) REFERENCES public.sedes(id_sede)
);
CREATE TABLE public.clientes (
  id_cliente bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  nombres text NOT NULL,
  apellidos text,
  apodo text,
  telefono text UNIQUE,
  observaciones text,
  estado boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente),
  CONSTRAINT clientes_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa)
);
CREATE TABLE public.cliente_sede (
  id_cliente_sede bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_cliente bigint NOT NULL,
  id_sede bigint NOT NULL,
  observaciones text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  tipo_relacion text NOT NULL CHECK (tipo_relacion = ANY (ARRAY['emisor'::text, 'receptor'::text, 'ambos'::text])),
  CONSTRAINT cliente_sede_pkey PRIMARY KEY (id_cliente_sede),
  CONSTRAINT cliente_sede_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT cliente_sede_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT cliente_sede_id_sede_fkey FOREIGN KEY (id_sede) REFERENCES public.sedes(id_sede)
);
CREATE TABLE public.lugares_operativos (
  id_lugar bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_sede bigint NOT NULL,
  nombre text NOT NULL,
  direccion_referencia text,
  observaciones text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  tipo_lugar text NOT NULL DEFAULT 'mercado'::text CHECK (tipo_lugar = ANY (ARRAY['mercado'::text, 'almacen'::text, 'calle'::text, 'rampa'::text, 'pasaje'::text, 'cajoneria'::text, 'otro'::text])),
  CONSTRAINT lugares_operativos_pkey PRIMARY KEY (id_lugar),
  CONSTRAINT lugares_operativos_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT lugares_operativos_id_sede_fkey FOREIGN KEY (id_sede) REFERENCES public.sedes(id_sede)
);
CREATE TABLE public.puestos (
  id_puesto bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_lugar bigint NOT NULL,
  numero_puesto text NOT NULL,
  referencia text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT puestos_pkey PRIMARY KEY (id_puesto),
  CONSTRAINT puestos_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT puestos_id_lugar_fkey FOREIGN KEY (id_lugar) REFERENCES public.lugares_operativos(id_lugar)
);
CREATE TABLE public.camiones (
  id_camion bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  placa text NOT NULL,
  observaciones text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  descripcion text,
  CONSTRAINT camiones_pkey PRIMARY KEY (id_camion),
  CONSTRAINT camiones_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa)
);
CREATE TABLE public.frutas (
  id_fruta bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT frutas_pkey PRIMARY KEY (id_fruta),
  CONSTRAINT frutas_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa)
);
CREATE TABLE public.variedades (
  id_variedad bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_fruta bigint NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT variedades_pkey PRIMARY KEY (id_variedad),
  CONSTRAINT variedades_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT variedades_id_fruta_fkey FOREIGN KEY (id_fruta) REFERENCES public.frutas(id_fruta)
);
CREATE TABLE public.calidades (
  id_calidad bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calidades_pkey PRIMARY KEY (id_calidad),
  CONSTRAINT calidades_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa)
);
CREATE TABLE public.tipos_jaba (
  id_tipo_jaba bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  nombre text NOT NULL,
  tipo_material text CHECK (tipo_material = ANY (ARRAY['madera'::text, 'plastico'::text])),
  descripcion text,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tipos_jaba_pkey PRIMARY KEY (id_tipo_jaba),
  CONSTRAINT tipos_jaba_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa)
);
CREATE TABLE public.operaciones_carga (
  id_operacion bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_sede_origen bigint NOT NULL,
  id_sede_destino bigint,
  id_camion bigint NOT NULL,
  id_encargado_carga bigint,
  id_repartidor_asignado bigint,
  fecha_carga date NOT NULL,
  hora_carga time without time zone,
  estado text DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'en_curso'::text, 'en_transito'::text, 'repartiendo'::text, 'completado'::text, 'cancelado'::text])),
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT operaciones_carga_pkey PRIMARY KEY (id_operacion),
  CONSTRAINT operaciones_carga_id_encargado_carga_fkey FOREIGN KEY (id_encargado_carga) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT operaciones_carga_id_repartidor_asignado_fkey FOREIGN KEY (id_repartidor_asignado) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT operaciones_carga_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT operaciones_carga_id_sede_origen_fkey FOREIGN KEY (id_sede_origen) REFERENCES public.sedes(id_sede),
  CONSTRAINT operaciones_carga_id_sede_destino_fkey FOREIGN KEY (id_sede_destino) REFERENCES public.sedes(id_sede),
  CONSTRAINT operaciones_carga_id_camion_fkey FOREIGN KEY (id_camion) REFERENCES public.camiones(id_camion)
);
CREATE TABLE public.detalle_carga (
  id_detalle_carga bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_operacion bigint NOT NULL,
  id_cliente_emisor bigint NOT NULL,
  id_fruta bigint NOT NULL,
  id_variedad bigint,
  id_tipo_jaba bigint NOT NULL,
  cantidad_jabas integer NOT NULL CHECK (cantidad_jabas > 0),
  es_reparto boolean DEFAULT false,
  instruccion_reparto text,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  requiere_retorno_jabas boolean NOT NULL DEFAULT false,
  CONSTRAINT detalle_carga_pkey PRIMARY KEY (id_detalle_carga),
  CONSTRAINT detalle_carga_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT detalle_carga_id_operacion_fkey FOREIGN KEY (id_operacion) REFERENCES public.operaciones_carga(id_operacion),
  CONSTRAINT detalle_carga_id_cliente_emisor_fkey FOREIGN KEY (id_cliente_emisor) REFERENCES public.clientes(id_cliente),
  CONSTRAINT detalle_carga_id_fruta_fkey FOREIGN KEY (id_fruta) REFERENCES public.frutas(id_fruta),
  CONSTRAINT detalle_carga_id_variedad_fkey FOREIGN KEY (id_variedad) REFERENCES public.variedades(id_variedad),
  CONSTRAINT detalle_carga_id_tipo_jaba_fkey FOREIGN KEY (id_tipo_jaba) REFERENCES public.tipos_jaba(id_tipo_jaba)
);
CREATE TABLE public.items_reparto (
  id_item_reparto bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_detalle_carga bigint NOT NULL,
  id_cliente_receptor bigint,
  id_puesto bigint NOT NULL,
  cantidad_asignada integer NOT NULL CHECK (cantidad_asignada > 0),
  orden_entrega integer,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  seccion text CHECK (seccion IS NULL OR (seccion = ANY (ARRAY['A'::text, 'B'::text, 'C'::text]))),
  CONSTRAINT items_reparto_pkey PRIMARY KEY (id_item_reparto),
  CONSTRAINT items_reparto_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT items_reparto_id_detalle_carga_fkey FOREIGN KEY (id_detalle_carga) REFERENCES public.detalle_carga(id_detalle_carga),
  CONSTRAINT items_reparto_id_cliente_receptor_fkey FOREIGN KEY (id_cliente_receptor) REFERENCES public.clientes(id_cliente),
  CONSTRAINT items_reparto_id_puesto_fkey FOREIGN KEY (id_puesto) REFERENCES public.puestos(id_puesto)
);
CREATE TABLE public.guias_operativas (
  id_guia bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  numero_guia text NOT NULL,
  fecha_emision date NOT NULL,
  id_repartidor bigint,
  estado text DEFAULT 'emitida'::text CHECK (estado = ANY (ARRAY['emitida'::text, 'firmada'::text, 'anulada'::text, 'reemplazada'::text, 'observada'::text])),
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  id_item_reparto bigint NOT NULL,
  CONSTRAINT guias_operativas_pkey PRIMARY KEY (id_guia),
  CONSTRAINT guias_operativas_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT guias_operativas_id_repartidor_fkey FOREIGN KEY (id_repartidor) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT guias_operativas_id_item_reparto_fkey FOREIGN KEY (id_item_reparto) REFERENCES public.items_reparto(id_item_reparto)
);
CREATE TABLE public.entregas (
  id_entrega bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_guia bigint NOT NULL,
  id_item_reparto bigint NOT NULL,
  id_entregador bigint,
  fecha_entrega date NOT NULL,
  hora_entrega time without time zone,
  cantidad_entregada integer NOT NULL CHECK (cantidad_entregada >= 0),
  cantidad_rechazada integer DEFAULT 0 CHECK (cantidad_rechazada >= 0),
  estado_entrega text NOT NULL CHECK (estado_entrega = ANY (ARRAY['pendiente'::text, 'entregado_parcial'::text, 'entregado_total'::text, 'rechazado'::text, 'observado'::text])),
  firma_recibido boolean DEFAULT false,
  nombre_recibe text,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT entregas_pkey PRIMARY KEY (id_entrega),
  CONSTRAINT entregas_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT entregas_id_guia_fkey FOREIGN KEY (id_guia) REFERENCES public.guias_operativas(id_guia),
  CONSTRAINT entregas_id_item_reparto_fkey FOREIGN KEY (id_item_reparto) REFERENCES public.items_reparto(id_item_reparto),
  CONSTRAINT entregas_id_entregador_fkey FOREIGN KEY (id_entregador) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.incidencias (
  id_incidencia bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  fecha_incidencia date NOT NULL,
  hora_incidencia time without time zone,
  id_operacion bigint,
  id_guia bigint,
  id_entrega bigint,
  tipo_incidencia text NOT NULL CHECK (tipo_incidencia = ANY (ARRAY['cambio_destino'::text, 'rechazo_receptor'::text, 'diferencia_cantidad'::text, 'daño_producto'::text, 'perdida_jaba'::text, 'accidente'::text, 'otro'::text])),
  descripcion text NOT NULL,
  accion_tomada text,
  id_usuario_reporta bigint,
  estado text DEFAULT 'abierta'::text CHECK (estado = ANY (ARRAY['abierta'::text, 'en_revision'::text, 'resuelta'::text, 'cerrada'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incidencias_pkey PRIMARY KEY (id_incidencia),
  CONSTRAINT incidencias_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT incidencias_id_operacion_fkey FOREIGN KEY (id_operacion) REFERENCES public.operaciones_carga(id_operacion),
  CONSTRAINT incidencias_id_guia_fkey FOREIGN KEY (id_guia) REFERENCES public.guias_operativas(id_guia),
  CONSTRAINT incidencias_id_entrega_fkey FOREIGN KEY (id_entrega) REFERENCES public.entregas(id_entrega),
  CONSTRAINT incidencias_id_usuario_reporta_fkey FOREIGN KEY (id_usuario_reporta) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.evidencias (
  id_evidencia bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  tipo_entidad text NOT NULL CHECK (tipo_entidad = ANY (ARRAY['operacion'::text, 'detalle_carga'::text, 'guia'::text, 'entrega'::text, 'incidencia'::text, 'jaba_por_pagar'::text, 'jaba_por_cobrar'::text, 'recuperacion_jaba'::text, 'devolucion_jaba_emisor'::text])),
  id_entidad bigint NOT NULL,
  url_archivo text NOT NULL,
  tipo_archivo text,
  descripcion text,
  subido_por bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT evidencias_pkey PRIMARY KEY (id_evidencia),
  CONSTRAINT evidencias_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT evidencias_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.logs_actividad (
  id_log bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint,
  id_usuario bigint,
  accion text NOT NULL,
  tabla_afectada text,
  id_registro bigint,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT logs_actividad_pkey PRIMARY KEY (id_log),
  CONSTRAINT logs_actividad_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT logs_actividad_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.detalle_carga_calidades (
  id_detalle_carga_calidad bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_detalle_carga bigint NOT NULL,
  id_calidad bigint NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT detalle_carga_calidades_pkey PRIMARY KEY (id_detalle_carga_calidad),
  CONSTRAINT detalle_carga_calidades_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT detalle_carga_calidades_id_detalle_carga_fkey FOREIGN KEY (id_detalle_carga) REFERENCES public.detalle_carga(id_detalle_carga),
  CONSTRAINT detalle_carga_calidades_id_calidad_fkey FOREIGN KEY (id_calidad) REFERENCES public.calidades(id_calidad)
);
CREATE TABLE public.jabas_por_pagar (
  id_jaba_pagar bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_detalle_carga bigint NOT NULL,
  id_cliente_emisor bigint NOT NULL,
  id_tipo_jaba bigint NOT NULL,
  fecha_origen date NOT NULL,
  cantidad_debida integer NOT NULL CHECK (cantidad_debida > 0),
  cantidad_pagada integer NOT NULL DEFAULT 0 CHECK (cantidad_pagada >= 0),
  saldo_pendiente integer NOT NULL CHECK (saldo_pendiente >= 0),
  estado text NOT NULL DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'parcial'::text, 'completado'::text, 'observado'::text, 'anulado'::text])),
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT jabas_por_pagar_pkey PRIMARY KEY (id_jaba_pagar),
  CONSTRAINT jabas_por_pagar_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT jabas_por_pagar_id_detalle_carga_fkey FOREIGN KEY (id_detalle_carga) REFERENCES public.detalle_carga(id_detalle_carga),
  CONSTRAINT jabas_por_pagar_id_cliente_emisor_fkey FOREIGN KEY (id_cliente_emisor) REFERENCES public.clientes(id_cliente),
  CONSTRAINT jabas_por_pagar_id_tipo_jaba_fkey FOREIGN KEY (id_tipo_jaba) REFERENCES public.tipos_jaba(id_tipo_jaba)
);
CREATE TABLE public.jabas_por_cobrar (
  id_jaba_cobrar bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_entrega bigint NOT NULL,
  id_item_reparto bigint,
  id_cliente_receptor bigint NOT NULL,
  id_puesto bigint,
  id_tipo_jaba bigint NOT NULL,
  fecha_origen date NOT NULL,
  cantidad_debida integer NOT NULL CHECK (cantidad_debida > 0),
  cantidad_recuperada integer NOT NULL DEFAULT 0 CHECK (cantidad_recuperada >= 0),
  saldo_pendiente integer NOT NULL CHECK (saldo_pendiente >= 0),
  estado text NOT NULL DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'parcial'::text, 'completado'::text, 'observado'::text, 'anulado'::text])),
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  seccion text CHECK (seccion IS NULL OR (seccion = ANY (ARRAY['A'::text, 'B'::text, 'C'::text]))),
  CONSTRAINT jabas_por_cobrar_pkey PRIMARY KEY (id_jaba_cobrar),
  CONSTRAINT jabas_por_cobrar_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT jabas_por_cobrar_id_entrega_fkey FOREIGN KEY (id_entrega) REFERENCES public.entregas(id_entrega),
  CONSTRAINT jabas_por_cobrar_id_item_reparto_fkey FOREIGN KEY (id_item_reparto) REFERENCES public.items_reparto(id_item_reparto),
  CONSTRAINT jabas_por_cobrar_id_cliente_receptor_fkey FOREIGN KEY (id_cliente_receptor) REFERENCES public.clientes(id_cliente),
  CONSTRAINT jabas_por_cobrar_id_puesto_fkey FOREIGN KEY (id_puesto) REFERENCES public.puestos(id_puesto),
  CONSTRAINT jabas_por_cobrar_id_tipo_jaba_fkey FOREIGN KEY (id_tipo_jaba) REFERENCES public.tipos_jaba(id_tipo_jaba)
);
CREATE TABLE public.recuperaciones_jabas (
  id_recuperacion bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_jaba_cobrar bigint NOT NULL,
  fecha_recuperacion date NOT NULL,
  tipo_recuperacion text NOT NULL CHECK (tipo_recuperacion = ANY (ARRAY['vale'::text, 'recojo_puesto'::text, 'recojo_almacen'::text, 'ajuste'::text, 'perdida'::text])),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  id_usuario_responsable bigint,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  saldo_resultante integer DEFAULT 0,
  CONSTRAINT recuperaciones_jabas_pkey PRIMARY KEY (id_recuperacion),
  CONSTRAINT recuperaciones_jabas_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT recuperaciones_jabas_id_jaba_cobrar_fkey FOREIGN KEY (id_jaba_cobrar) REFERENCES public.jabas_por_cobrar(id_jaba_cobrar),
  CONSTRAINT recuperaciones_jabas_id_usuario_responsable_fkey FOREIGN KEY (id_usuario_responsable) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.devoluciones_jabas_emisor (
  id_devolucion bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_jaba_pagar bigint NOT NULL,
  fecha_devolucion date NOT NULL,
  tipo_devolucion text NOT NULL CHECK (tipo_devolucion = ANY (ARRAY['jabas_fisicas'::text, 'vale_canjeado'::text, 'ajuste'::text, 'perdida_asumida'::text])),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  id_usuario_responsable bigint,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  saldo_resultante integer DEFAULT 0,
  CONSTRAINT devoluciones_jabas_emisor_pkey PRIMARY KEY (id_devolucion),
  CONSTRAINT devoluciones_jabas_emisor_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT devoluciones_jabas_emisor_id_jaba_pagar_fkey FOREIGN KEY (id_jaba_pagar) REFERENCES public.jabas_por_pagar(id_jaba_pagar),
  CONSTRAINT devoluciones_jabas_emisor_id_usuario_responsable_fkey FOREIGN KEY (id_usuario_responsable) REFERENCES public.usuarios(id_usuario)
);
CREATE TABLE public.usuarios_roles (
  id_usuario_rol bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario bigint NOT NULL,
  id_rol_usuario bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usuarios_roles_pkey PRIMARY KEY (id_usuario_rol),
  CONSTRAINT usuarios_roles_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT usuarios_roles_id_rol_usuario_fkey FOREIGN KEY (id_rol_usuario) REFERENCES public.roles_usuarios(id_rol_usuario)
);
CREATE TABLE public.clientes_puestos (
  id_cliente_puesto bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_cliente bigint NOT NULL,
  id_puesto bigint NOT NULL,
  fecha_inicio date DEFAULT CURRENT_DATE,
  fecha_fin date,
  estado boolean DEFAULT true,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  seccion text CHECK (seccion IS NULL OR (seccion = ANY (ARRAY['A'::text, 'B'::text, 'C'::text]))),
  CONSTRAINT clientes_puestos_pkey PRIMARY KEY (id_cliente_puesto),
  CONSTRAINT clientes_puestos_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT clientes_puestos_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT clientes_puestos_id_puesto_fkey FOREIGN KEY (id_puesto) REFERENCES public.puestos(id_puesto)
);
CREATE TABLE public.items_reparto_detalle (
  id_item_reparto_detalle bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_empresa bigint NOT NULL,
  id_item_reparto bigint NOT NULL,
  id_detalle_carga_calidad bigint NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric,
  subtotal numeric DEFAULT 
CASE
    WHEN (precio_unitario IS NULL) THEN NULL::numeric
    ELSE ((cantidad)::numeric * precio_unitario)
END,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT items_reparto_detalle_pkey PRIMARY KEY (id_item_reparto_detalle),
  CONSTRAINT items_reparto_detalle_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresas(id_empresa),
  CONSTRAINT items_reparto_detalle_id_item_reparto_fkey FOREIGN KEY (id_item_reparto) REFERENCES public.items_reparto(id_item_reparto),
  CONSTRAINT items_reparto_detalle_id_detalle_carga_calidad_fkey FOREIGN KEY (id_detalle_carga_calidad) REFERENCES public.detalle_carga_calidades(id_detalle_carga_calidad)
);