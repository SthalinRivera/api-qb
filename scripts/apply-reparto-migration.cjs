// Aplicación transaccional de la migración aditiva sobre una base existente.
require('dotenv/config');
const fs = require('fs');
const { Client } = require('pg');
const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
(async () => {
 await db.connect(); await db.query('BEGIN');
 await db.query("SET LOCAL lock_timeout = '5s'");
 await db.query("SET LOCAL statement_timeout = '30s'");
 const existe = await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='detalle_carga' AND column_name='orden_carga'");
 if (existe.rowCount) throw new Error('La columna ya existe; revisar estado de migración antes de ejecutar nuevamente.');
 await db.query(fs.readFileSync('prisma/migrations/202611100001_flujo_reparto/migration.sql','utf8'));
 const result = await db.query('SELECT count(*) AS cargas, count(DISTINCT (id_operacion,orden_carga)) AS ordenes_unicos FROM detalle_carga');
 if (result.rows[0].cargas !== result.rows[0].ordenes_unicos) throw new Error('Validación del orden fallida');
 await db.query('COMMIT');
 console.log(JSON.stringify({ migration: '202611100001_flujo_reparto', applied: true, ...result.rows[0] }));
})().catch(async error => { await db.query('ROLLBACK').catch(()=>{}); console.error(error.message); process.exitCode=1; }).finally(()=>db.end());
