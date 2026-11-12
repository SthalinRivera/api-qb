import { ClientesService } from './clientes.service';
describe('Relaciones cliente-distrito',()=>{
 it('elimina por ID de relación, distinguiendo emisor y receptor del mismo distrito',async()=>{
  const delegate={findFirst:jest.fn(async()=>({id_cliente_distrito:9n})),delete:jest.fn()};
  const service=new ClientesService({scoped:{cliente_distrito:delegate}} as any);
  await service.removeUbicacion(3,9);
  expect(delegate.findFirst).toHaveBeenCalledWith({where:{id_cliente:3n,id_cliente_distrito:9n,estado:true}});
  expect(delegate.delete).toHaveBeenCalledWith({where:{id_cliente_distrito:9n}});
 });
 it('busca ambos roles mediante dos relaciones en vez del valor eliminado',()=>{
  const service=new ClientesService({} as any);
  expect((service as any).buildListWhere(undefined,undefined,'ambos','010101').AND).toHaveLength(2);
 });
});
