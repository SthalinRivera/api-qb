// Integración de solo lectura: scope también dentro de la transacción Prisma.
require('ts-node/register');
const { PrismaService } = require('../src/config/prisma/prisma.service');
const { OperacionesCargaService } = require('../src/modules/operaciones-carga/operaciones-carga.service');
const { requestContext } = require('../src/common/security/request-context');
const db = new PrismaService();
(async () => {
 const empresa = await db.empresas.findFirst({ select: { id_empresa: true } });
 if (!empresa) throw new Error('No hay empresa para verificar');
 const actor = { empresaId: empresa.id_empresa, usuarioId: 0n, roles: ['administrador'], administrador: true, repartidor: false };
 await requestContext.run(actor, async () => {
   const fuera = await db.scoped.operaciones_carga.count({ where: { id_empresa: { not: actor.empresaId } } });
   const transaccion = await db.scoped.$transaction(tx => tx.clientes.count({ where: { id_empresa: { not: actor.empresaId } } }));
   const service = new OperacionesCargaService(db, {});
   const resumen = await service.resumenRepartos({ page: 1, limit: 2 });
   if (resumen.data.length) { const reparto = await service.findOne(Number(resumen.data[0].id_operacion)); if (!reparto.resumen || !reparto.detalle_carga) throw new Error('Contrato consolidado incompleto'); }
   if (fuera !== 0 || transaccion !== 0) throw new Error('El aislamiento falló');
 });
 console.log('tenant_scope_readonly_ok');
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(()=>db.$disconnect());
