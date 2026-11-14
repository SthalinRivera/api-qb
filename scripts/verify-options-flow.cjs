// Verifies real services and SQL. All operational rows are rolled back; PostgreSQL sequences may advance.
require('ts-node/register/transpile-only');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {PrismaService} = require('../src/config/prisma/prisma.service');
const {requestContext} = require('../src/common/security/request-context');
const {OpcionesFlujoController} = require('../src/modules/opciones-flujo/opciones-flujo.controller');
const {OperacionesCargaService} = require('../src/modules/operaciones-carga/operaciones-carga.service');
const {DetalleCargaService} = require('../src/modules/detalle-carga/detalle-carga.service');
const {ItemsRepartoService} = require('../src/modules/items-reparto/items-reparto.service');
const {GuiasOperativasService} = require('../src/modules/guias-operativas/guias-operativas.service');
const {EntregasService} = require('../src/modules/entregas/entregas.service');
const {AuthService} = require('../src/modules/auth/auth.service');
const rollback = new Error('ROLLBACK_VERIFICATION');
(async()=>{
 const db=new PrismaService(); let opId; const checks=[];
 const timer=setTimeout(()=>{console.error('Flow check timed out');process.exit(2)},300000);
 try {
  await db.onModuleInit();
  const user=await db.usuarios.findFirst({where:{estado:true},select:{id_usuario:true,id_empresa:true,email:true,google_uid:true}});
  assert(user,'No active test context');
  await requestContext.run({empresaId:user.id_empresa,usuarioId:user.id_usuario,roles:['administrador'],administrador:true,repartidor:false},async()=>{
   try {await db.scoped.$transaction(async tx=>{
    // Flatten service transactions into this outer rollback-only transaction.
    let scoped;
    scoped=new Proxy(tx,{get(target,key){if(key==='$transaction')return fn=>typeof fn==='function'?fn(scoped):Promise.all(fn);return Reflect.get(target,key);}});
    const p={empresaId:user.id_empresa,scoped};
    const api=new OpcionesFlujoController(p), guias=new GuiasOperativasService(p), ops=new OperacionesCargaService(p,guias), carga=new DetalleCargaService(p), reparto=new ItemsRepartoService(p), entregas=new EntregasService(p);
    const session=await new AuthService(p).getProfile({user:{email:user.email,id:user.google_uid,user_metadata:{}}},true);
    assert(session.id && session.modulos); assert(!('ubicacion' in session)); checks.push('session minimal payload');
    let options=await api.opcionesOperacion({}); assert(options.origenes.length && options.camiones.length,'Missing origin/truck fixtures');
    const origen=options.origenes[0].id_ubigeo;
    options=await api.opcionesOperacion({origen}); assert(options.destinos.length,'Missing destination fixture');
    const op=await ops.create({id_ubigeo_origen:origen,id_ubigeo_destino:options.destinos[0].id_ubigeo,id_camion:Number(options.camiones[0].id_camion),fecha_carga:'2026-11-13',observaciones:'Rollback verification'});
    opId=op.id_operacion; const q={operacion:Number(opId)}; checks.push('operation creation with contextual options');
    const opts=await api.carga(q); assert(opts.emisores.length&&opts.frutas.length&&opts.tiposJaba.length&&opts.receptores.length,'Missing cargo fixtures');
    const detalle=await carga.create(Number(opId),{id_cliente_emisor:Number(opts.emisores[0].id_cliente),id_fruta:Number(opts.frutas[0].id_fruta),id_tipo_jaba:Number(opts.tiposJaba[0].id_tipo_jaba),cantidad_jabas:3,es_reparto:true,requiere_retorno_jabas:true});
    const det=Number(detalle.id_detalle_carga); checks.push('cargo creation');
    const qualities=await api.calidades({detalle:det}); assert(qualities.length,'Missing quality fixture');
    await carga.addCalidad(det,{id_calidad:Number(qualities[0].id_calidad),cantidad:3});
    const classification=await api.clasificacion({...q,detalle:det}); assert.equal(classification.clasificacionCompleta,true); checks.push('grouped classification screen');
    let repartoOptions=await api.reparto({...q,detalle:det}); assert.equal(repartoOptions.calidades[0].cantidad,3);
    const cliente=Number(repartoOptions.clientes[0].id_cliente);
    repartoOptions=await api.reparto({...q,detalle:det,cliente}); assert(repartoOptions.puestos.length);
    const items=await reparto.createMultipleFromCalidades({id_detalle_carga:det,asignaciones:[{id_cliente_receptor:cliente,id_puesto:Number(repartoOptions.puestos[0].id_puesto),detalles:[{id_detalle_carga_calidad:Number(repartoOptions.calidades[0].id_detalle_carga_calidad),cantidad:3}]}]});
    assert.equal((await api.reparto({...q,detalle:det})).calidades.length,0); checks.push('classification and assignment; exhausted quality excluded');
    await ops.finalizar(Number(opId)); await guias.emitirOperacion(Number(opId)); await ops.changeState(Number(opId),'repartiendo'); checks.push('confirm cargo, issue guide, start delivery');
    let pending=(await api.entrega(q)).items; assert.equal(pending.length,1); assert.equal(pending[0].saldo_pendiente,3);
    const body={id_item_reparto:Number(pending[0].id_item_reparto),id_guia:Number(pending[0].id_guia),fecha_entrega:'2026-11-13',cantidad_entregada:1,cantidad_rechazada:0,estado_entrega:'entregado_parcial',nombre_recibe:'Verification',firma_recibido:false};
    await entregas.create(body,Number(user.id_empresa),Number(user.id_usuario));
    pending=(await api.entrega(q)).items; assert.equal(pending[0].saldo_pendiente,2); checks.push('partial delivery and refreshed pending balance');
    await assert.rejects(()=>entregas.create({...body,cantidad_entregada:3},Number(user.id_empresa)),/saldo|pendiente|excede|supera|quedan/); checks.push('stale quantity rejected at save');
    await entregas.create({...body,cantidad_entregada:2,estado_entrega:'entregado_total'},Number(user.id_empresa),Number(user.id_usuario));
    assert.equal((await api.entrega(q)).items.length,0); checks.push('full delivery excluded from pending options');
    await ops.changeState(Number(opId),'completado'); checks.push('operation completed');
    throw rollback;
   },{timeout:240000,maxWait:5000});}catch(e){if(e!==rollback)throw e;}
   assert.equal(await db.scoped.operaciones_carga.count({where:{id_operacion:opId}}),0); checks.push('rollback verified: no test operation persisted');
  });
  fs.writeFileSync('docs/opciones-flujo-verificacion.json',JSON.stringify({passed:true,checks,scope:'Real database services in a rolled-back transaction; OAuth/browser not exercised'},null,2));
  console.log(JSON.stringify({passed:true,checks},null,2));
 }catch(e){console.error('Flow check failed:',e.code||e.name,String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted]').slice(-900));process.exitCode=1;}
 finally{clearTimeout(timer);await db.$disconnect();}
})();


