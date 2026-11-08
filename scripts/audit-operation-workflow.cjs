// Auditoría de solo lectura. Ejecutar desde la carpeta de la API.
require('dotenv/config');
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
(async () => {
  await client.connect();
  const { rows } = await client.query(`SELECT conrelid::regclass::text AS tabla, conname AS nombre, pg_get_constraintdef(oid) AS regla FROM pg_constraint WHERE contype='c' AND conrelid IN ('public.operaciones_carga'::regclass,'public.entregas'::regclass,'public.detalle_carga'::regclass,'public.detalle_carga_calidades'::regclass)`);
  console.log(JSON.stringify(rows, null, 2));
  const triggers = await client.query(`SELECT tgrelid::regclass::text AS tabla, tgname, pg_get_triggerdef(oid) AS regla FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('public.operaciones_carga'::regclass,'public.entregas'::regclass,'public.detalle_carga'::regclass,'public.detalle_carga_calidades'::regclass,'public.items_reparto'::regclass)`);
  console.log(JSON.stringify(triggers.rows, null, 2));
  const audit = await client.query(`SELECT
    (SELECT count(*) FROM entregas e JOIN guias_operativas g ON g.id_guia=e.id_guia WHERE e.id_item_reparto <> g.id_item_reparto) AS entregas_guia_otro_destino,
    (SELECT count(*) FROM items_reparto i WHERE (SELECT COALESCE(sum(e.cantidad_entregada),0) FROM entregas e WHERE e.id_item_reparto=i.id_item_reparto AND e.estado_entrega <> 'pendiente') > i.cantidad_asignada) AS destinos_entregados_en_exceso,
    (SELECT count(*) FROM jabas_por_pagar WHERE id_entrega IS NULL) AS deudas_sin_entrega`);
  console.log(JSON.stringify(audit.rows, null, 2));
  await client.end();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
