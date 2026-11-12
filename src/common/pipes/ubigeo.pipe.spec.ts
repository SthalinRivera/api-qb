import { UbigeoPipe } from './ubigeo.pipe';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOperacionCargaDto } from '../../modules/operaciones-carga/dto/create-operaciones-carga.dto';
import { CreateUsuarioDto } from '../../modules/usuarios/dto/create-usuario.dto';
describe('Ubicaciones', () => {
 it('mantiene ceros y rechaza IDs de sedes antiguos',()=>{const pipe=new UbigeoPipe();expect(pipe.transform('010101')).toBe('010101');expect(()=>pipe.transform('1')).toThrow();});
 it('exige origen y destino al crear operaciones', async()=>{const errors=await validate(plainToInstance(CreateOperacionCargaDto,{id_camion:1,fecha_carga:'2026-11-12'}));expect(errors.map(e=>e.property)).toEqual(expect.arrayContaining(['id_ubigeo_origen','id_ubigeo_destino']));});
 it('el usuario nuevo requiere ubigeo y rechaza la columna eliminada',async()=>{const errors=await validate(plainToInstance(CreateUsuarioDto,{nombres:'Prueba',email:'prueba@example.com',id_empresa:1,id_sede:2}),{whitelist:true,forbidNonWhitelisted:true});expect(errors.map(e=>e.property)).toEqual(expect.arrayContaining(['id_sede','id_ubigeo']));});
});
