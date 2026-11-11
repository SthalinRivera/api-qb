// Valida el SQL con copias temporales; no altera tablas ni datos persistentes.
require('dotenv/config');
const fs = require('fs');
const { Client } = require('pg');
const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
(async () => {
 await db.connect(); await db.query('BEGIN');
 await db.query("SET LOCAL lock_timeout = '3s'");
 for (const table of ['empresas','usuarios','items_reparto','detalle_carga','guias_operativas']) {
   await db.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`);
   await db.query(`INSERT INTO ${table} SELECT * FROM public.${table}`);
 }
 let sql = fs.readFileSync('prisma/migrations/202611100001_flujo_reparto/migration.sql','utf8').replace('CREATE TABLE resoluciones_reparto', 'CREATE TEMP TABLE resoluciones_reparto');
 await db.query(sql);
 const result = await db.query('SELECT count(*) AS cargas, count(DISTINCT (id_operacion,orden_carga)) AS ordenes_unicos, min(orden_carga) AS minimo FROM detalle_carga');
 console.log(JSON.stringify({ migration: 'validated_on_temporary_copies', ...result.rows[0] }));
 await db.query('ROLLBACK');
})().catch(async error => { await db.query('ROLLBACK').catch(()=>{}); console.error(error.message); process.exitCode=1; }).finally(()=>db.end());
