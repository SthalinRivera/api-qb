require('dotenv/config');
const fs=require('fs');
const {Test}=require('@nestjs/testing');
const {ValidationPipe}=require('@nestjs/common');
const {SwaggerModule,DocumentBuilder}=require('@nestjs/swagger');
const request=require('supertest');
const {applyResponseContract}=require('../dist/src/common/openapi/response-contract');
const {AppModule}=require('../dist/src/app.module');
const {PrismaService}=require('../dist/src/config/prisma/prisma.service');
const {SupabaseAuthGuard}=require('../dist/src/common/guards/supabase-auth.guard');
const {ApiResponseInterceptor}=require('../dist/src/common/interceptors/api-response.interceptor');
const {HttpExceptionFilter}=require('../dist/src/common/filters/http-exception.filter');
(async()=>{
 const probe=new PrismaService();let app;const print=console.log;console.log=()=>{};console.warn=()=>{};
 try{
  const user=await probe.usuarios.findFirst({where:{estado:true,google_uid:{not:null},usuarios_roles:{some:{roles_usuarios:{nombre:{in:['admin','administrador','superadmin','super_admin']}}}}}});
  if(!user)throw new Error('No hay un perfil administrador vinculado para las pruebas de lectura');
  const auth={canActivate(context){context.switchToHttp().getRequest().user={id:user.google_uid,email:user.email,user_metadata:{}};return true}};
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(SupabaseAuthGuard).useValue(auth).compile();
  app=module.createNestApplication({logger:false});app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));app.useGlobalInterceptors(new ApiResponseInterceptor());app.useGlobalFilters(new HttpExceptionFilter());await app.init();
  const doc=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('Quipubox').setVersion('2').addBearerAuth().build());
  fs.writeFileSync('docs/openapi.json',JSON.stringify(applyResponseContract(doc),null,2));
  const report=[];
  for(const [path,ops]of Object.entries(doc.paths)){
   if(!ops.get)continue;
   const target = path.replace(/\{ubigeo\}/g, user.id_ubigeo).replace(/\{[^}]+\}/g, '1');
   const res=await request(app.getHttpServer()).get(target).timeout(20000);
   report.push({path,status:res.status,contract:['success','statusCode','message','data','meta','errors'].every(key=>key in res.body)});
  }
  fs.writeFileSync('docs/endpoints-verification.json',JSON.stringify(report,null,2));
  print(JSON.stringify(report));
  if(report.some(r=>r.status>=500||!r.contract))process.exitCode=1;
 }catch(e){print(e.message);process.exitCode=1}finally{if(app)await app.close();await probe.$disconnect();console.log=print}
 // Prisma adapter pools may retain idle sockets after the application closes.
 process.exit(process.exitCode||0);
})();
