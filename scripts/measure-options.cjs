require('ts-node/register/transpile-only');
const {PrismaService} = require('../src/config/prisma/prisma.service');
const {requestContext} = require('../src/common/security/request-context');
const {OpcionesFlujoController} = require('../src/modules/opciones-flujo/opciones-flujo.controller');
const fs = require('node:fs');
const {ClientesService}=require('../src/modules/clientes/clientes.service');
const {UsuariosService}=require('../src/modules/usuarios/usuarios.service');
const {CamionesService}=require('../src/modules/camiones/camiones.service');
const {FrutasService}=require('../src/modules/frutas/frutas.service');
const {VariedadesService}=require('../src/modules/variedades/variedades.service');
const {TiposJabaService}=require('../src/modules/tipos-jaba/tipos-jaba.service');
const size = x => Buffer.byteLength(JSON.stringify(x, (_,v)=>typeof v === 'bigint' ? String(v) : v));
(async()=>{
 const db = new PrismaService();
 const timer = setTimeout(()=>{console.error('Database smoke check timed out');process.exit(2)},45000);
 try {
  await db.onModuleInit();
  const user = await db.usuarios.findFirst({where:{estado:true},select:{id_usuario:true,id_empresa:true}});
  if (!user) throw new Error('No active test context');
  await requestContext.run({empresaId:user.id_empresa,usuarioId:user.id_usuario,roles:['administrador'],administrador:true,repartidor:false},async()=>{
   const api = new OpcionesFlujoController(db);
   const initial = await api.opcionesOperacion({});
   const selected = initial.origenes[0] ? await api.opcionesOperacion({origen:initial.origenes[0].id_ubigeo}) : null;
   const baselineOp = await Promise.all([
    db.scoped.distritos.findMany({include:{provincias:{include:{departamentos:true}}}}),
    new CamionesService(db).findAll(Number(user.id_empresa)),
    new UsuariosService(db).findAll(),
   ]);
   const result = {note:'Read-only database comparison; JSON bytes before HTTP compression, one company, no browser/OAuth measurement.',operacion:{beforeRequests:3,afterRequests:1,beforeBytes:baselineOp.reduce((n,x)=>n+size(x),0),afterBytes:size(initial),afterOriginSelectionBytes:selected?size(selected):null},checks:{destinos:!!selected},carga:null,reparto:null,entrega:null};
   const op = await db.scoped.operaciones_carga.findFirst({select:{id_operacion:true}});
   if(op){
    const q={operacion:Number(op.id_operacion)};
    const carga=await api.carga(q);
    const before=await Promise.all([new ClientesService(db).findAll(),new FrutasService(db).findAll(),new VariedadesService(db).findAll(),new TiposJabaService(db).findAll(Number(user.id_empresa))]);
    result.carga={beforeRequests:4,afterRequests:1,beforeBytes:before.reduce((n,x)=>n+size(x),0),afterBytes:size(carga)};
    const detalle=await db.scoped.detalle_carga.findFirst({where:{id_operacion:op.id_operacion,es_reparto:true},select:{id_detalle_carga:true}});
    if(detalle){const reparto=await api.reparto({...q,detalle:Number(detalle.id_detalle_carga)});result.reparto={optionsBytes:size(reparto),availableQualities:reparto.calidades.length};await api.calidades({detalle:Number(detalle.id_detalle_carga)});}
    const delivering=await db.scoped.operaciones_carga.findFirst({where:{estado:'repartiendo'},select:{id_operacion:true}});
    if(delivering){const entrega=await api.entrega({operacion:Number(delivering.id_operacion)});result.entrega={bytes:size(entrega),pendingItems:entrega.items.length};}
   }
   fs.writeFileSync('docs/opciones-flujo-medicion.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  });
 } catch(e){console.error('Database smoke check:',e.code || e.name, String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted]').slice(0,300));process.exitCode=1;}
 finally {clearTimeout(timer);await db.$disconnect();}
})();
