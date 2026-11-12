import { Prisma } from '@prisma/client';
import { apiSuccess, serializeApi } from './api-response.interceptor';
describe('Contrato de respuestas', () => {
 it('preserva ubigeos, bigint sin perder precisión y serializa decimales', () => {
  expect(serializeApi({ id_usuario: 9007199254740993n, id_ubigeo: '010101', precio: new Prisma.Decimal('123.45') })).toEqual({ id_usuario: '9007199254740993', id_ubigeo: '010101', precio: 123.45 });
 });
 it('separa datos y metadatos sin anidar la paginación', () => {
  expect(apiSuccess({ data: [{ id: 1n }], total: 1, page: 1, limit: 10 },200)).toEqual({ success:true, statusCode:200, message:'Operación exitosa',data:[{id:'1'}],meta:{total:1,page:1,limit:10},errors:null });
 });
 it('normaliza fechas y horas de postgres', () => expect(serializeApi({ fecha_carga: new Date('2026-11-12T00:00:00Z'), hora_carga: new Date('1970-01-01T08:30:00Z') })).toEqual({fecha_carga:'2026-11-12',hora_carga:'08:30:00'}));
 it('usa el mismo contrato para listas, objetos y acciones vacías', () => {
  for (const data of [[],{ nombre:'Lima' },null]) expect(apiSuccess(data,200)).toMatchObject({success:true,statusCode:200,data,meta:null,errors:null});
 });
});
