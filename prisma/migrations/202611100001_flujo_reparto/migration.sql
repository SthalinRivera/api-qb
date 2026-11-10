-- Revisar docs/flujo-reparto-v2.md. No reclasifica históricos ambiguos.
ALTER TABLE detalle_carga ADD COLUMN orden_carga integer;
WITH orden AS (SELECT id_detalle_carga, row_number() OVER (PARTITION BY id_operacion ORDER BY created_at NULLS LAST, id_detalle_carga)::integer AS n FROM detalle_carga)
UPDATE detalle_carga d SET orden_carga=o.n FROM orden o WHERE d.id_detalle_carga=o.id_detalle_carga;
ALTER TABLE detalle_carga ALTER COLUMN orden_carga SET NOT NULL, ALTER COLUMN orden_carga SET DEFAULT 1;
ALTER TABLE detalle_carga ADD CONSTRAINT detalle_orden_positivo CHECK (orden_carga > 0);
CREATE UNIQUE INDEX detalle_orden_operacion ON detalle_carga(id_operacion, orden_carga);
ALTER TABLE guias_operativas ADD COLUMN cobertura jsonb;
-- Documentos antiguos: no se inventa un snapshot histórico.
CREATE UNIQUE INDEX guia_vigente_item ON guias_operativas(id_empresa,id_item_reparto) WHERE estado NOT IN ('anulada','reemplazada');
CREATE TABLE resoluciones_reparto (
 id_resolucion bigserial PRIMARY KEY,
 id_empresa bigint NOT NULL REFERENCES empresas(id_empresa),
 id_item_reparto bigint NOT NULL REFERENCES items_reparto(id_item_reparto),
 id_usuario bigint NOT NULL REFERENCES usuarios(id_usuario),
 tipo text NOT NULL CHECK (tipo IN ('devolucion','merma')),
 cantidad integer NOT NULL CHECK (cantidad > 0),
 motivo text NOT NULL,
 clave_idempotencia text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (id_empresa,clave_idempotencia)
);
ALTER TABLE resoluciones_reparto ENABLE ROW LEVEL SECURITY;
