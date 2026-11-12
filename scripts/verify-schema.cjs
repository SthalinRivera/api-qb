require('dotenv/config');
const fs=require('fs');
const {PrismaService}=require('../dist/src/config/prisma/prisma.service');
const {Prisma}=require('@prisma/client');
(async()=>{const prisma=new PrismaService();const report={models:[],errors:[]};try{
 for(const model of Prisma.dmmf.datamodel.models){try{await prisma[model.name].findFirst();report.models.push(model.name)}catch(e){report.errors.push({model:model.name,code:e.code||e.name})}}
 fs.writeFileSync('docs/schema-verification.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({models:report.models.length,errors:report.errors}));
 if(report.errors.length)process.exitCode=1;
}finally{await prisma.$disconnect()}})();
