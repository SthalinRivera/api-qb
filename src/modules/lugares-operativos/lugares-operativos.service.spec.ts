import { LugaresOperativosService } from './lugares-operativos.service';
describe('Estado del lugar por empresa',()=>{
 it('desactiva solo el vínculo, sin modificar el catálogo compartido',async()=>{
  const row={id_lugar:1n,estado:true,empresa_lugares:[{estado:false}]};
  const tx={lugares_operativos:{update:jest.fn(),findUnique:jest.fn(async()=>row)},empresa_lugares:{update:jest.fn()}};
  const prisma:any={empresaId:7n,scoped:{$transaction:async(fn:any)=>fn(tx)}};
  const service=new LugaresOperativosService(prisma);
  jest.spyOn(service,'findOne').mockResolvedValue({id_lugar:1n} as any);
  const result=await service.changeState(1,false);
  expect(tx.lugares_operativos.update).not.toHaveBeenCalled();
  expect(tx.empresa_lugares.update).toHaveBeenCalledWith({where:{id_empresa_id_lugar:{id_empresa:7n,id_lugar:1n}},data:{estado:false}});
  expect(result).toMatchObject({estado:false,estado_catalogo:true});
 });
});
