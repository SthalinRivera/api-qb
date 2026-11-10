// Solo lectura: no reclasifica operaciones ni reconstruye documentos históricos.
require('dotenv/config');
const { Client } = require('pg');
const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
(async () => {
  await db.connect();
  await db.query('BEGIN READ ONLY');
  const report = {};
  report.estados = (await db.query('SELECT estado,count(*) FROM operaciones_carga GROUP BY estado')).rows;
  report.repartiendo = (await db.query(`SELECT o.id_operacion,
    (SELECT count(*) FROM entregas e JOIN items_reparto i USING(id_item_reparto) JOIN detalle_carga d USING(id_detalle_carga) WHERE d.id_operacion=o.id_operacion) AS entregas,
    (SELECT count(*) FROM guias_operativas g JOIN items_reparto i USING(id_item_reparto) JOIN detalle_carga d USING(id_detalle_carga) WHERE d.id_operacion=o.id_operacion) AS guias,
    'Revisar evidencia de salida e inicio físico; ausencia de entrega no demuestra tránsito' AS criterio
    FROM operaciones_carga o WHERE estado='repartiendo'`)).rows;
  report.guias_duplicadas = (await db.query("SELECT id_empresa,id_item_reparto,count(*) FROM guias_operativas WHERE estado NOT IN ('anulada','reemplazada') GROUP BY id_empresa,id_item_reparto HAVING count(*)>1")).rows;
  report.documentos_sin_snapshot = (await db.query('SELECT count(*) FROM guias_operativas')).rows;
  report.relaciones_empresa = (await db.query(`SELECT
    (SELECT count(*) FROM detalle_carga d JOIN operaciones_carga o USING(id_operacion) WHERE d.id_empresa<>o.id_empresa) AS cargas,
    (SELECT count(*) FROM items_reparto i JOIN detalle_carga d USING(id_detalle_carga) JOIN clientes c ON c.id_cliente=i.id_cliente_receptor JOIN puestos p USING(id_puesto) WHERE i.id_empresa<>d.id_empresa OR i.id_empresa<>c.id_empresa OR i.id_empresa<>p.id_empresa) AS destinos,
    (SELECT count(*) FROM entregas e JOIN guias_operativas g USING(id_guia) WHERE e.id_empresa<>g.id_empresa OR e.id_item_reparto<>g.id_item_reparto) AS entregas`)).rows;
  report.reglas_estados = (await db.query("SELECT conname,pg_get_constraintdef(oid) AS regla FROM pg_constraint WHERE conrelid='operaciones_carga'::regclass AND contype='c'")).rows;
  console.log(JSON.stringify(report, null, 2));
  await db.query('ROLLBACK');
})().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
