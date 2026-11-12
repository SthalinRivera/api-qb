import { tenantRelations, listRelations } from './tenant-relations.generated';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor } from './request-context';

const modelos = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
export function alcanceModelo(model: string, actor: Actor): Record<string, any> {
  const scoped: Record<string, any> = {};
  if (modelos.get(model)?.fields.some((f) => f.name === 'id_empresa')) scoped.id_empresa = actor.empresaId;
  if (model === 'lugares_operativos') scoped.empresa_lugares = { some: { id_empresa: actor.empresaId } };
  if (model === 'puestos') scoped.lugares_operativos = { empresa_lugares: { some: { id_empresa: actor.empresaId } } };
  if (model === 'usuarios_roles') scoped.usuarios = { id_empresa: actor.empresaId };
  if (actor.repartidor) {
    const op = { id_repartidor_asignado: actor.usuarioId };
    const paths: Record<string, any> = {
      operaciones_carga: op, detalle_carga: { operaciones_carga: op },
      detalle_carga_calidades: { detalle_carga: { operaciones_carga: op } },
      items_reparto: { detalle_carga: { operaciones_carga: op } },
      items_reparto_detalle: { items_reparto: { detalle_carga: { operaciones_carga: op } } },
      guias_operativas: { items_reparto: { detalle_carga: { operaciones_carga: op } } },
      entregas: { items_reparto: { detalle_carga: { operaciones_carga: op } } },
      resoluciones_reparto: { items_reparto: { detalle_carga: { operaciones_carga: op } } },
    };
    Object.assign(scoped, paths[model] || {});
  }
  return scoped;
}

export async function prepararConsulta(model: string, operation: string, args: any, actor: Actor, base: any) {
  const scope = alcanceModelo(model, actor);
  if (operation.startsWith('find') || ['count','aggregate','groupBy','update','updateMany','updateManyAndReturn','delete','deleteMany','upsert'].includes(operation)) {
    args.where = { ...args.where, AND: [args.where?.AND || {}, scope] };
  }
  // Scope nested lists too: shared places must not expose another company's clients.
  const scopeRelations = (name: string, selection: any) => {
    if (!selection) return;
    for (const field of modelos.get(name)?.fields || []) {
      if (field.kind !== 'object' || !selection[field.name]) continue;
      const nestedScope = alcanceModelo(field.type, actor);
      if (listRelations[name]?.includes(field.name) && Object.keys(nestedScope).length) {
        if (selection[field.name] === true) selection[field.name] = {};
        const nested = selection[field.name];
        nested.where = { ...nested.where, AND: [nested.where?.AND || {}, nestedScope] };
      }
      const nested = selection[field.name];
      scopeRelations(field.type, nested.include);
      scopeRelations(field.type, nested.select);
    }
  };
  scopeRelations(model, args.include);
  scopeRelations(model, args.select);
  if (['lugares_operativos', 'puestos'].includes(model) && ['update','updateMany','delete','deleteMany','upsert'].includes(operation)) {
    const shared = model === 'puestos' ? { lugares_operativos: { empresa_lugares: { some: { id_empresa: { not: actor.empresaId } } } } } : { empresa_lugares: { some: { id_empresa: { not: actor.empresaId } } } };
    if (await base[model].findFirst({ where: { AND: [args.where || {}, shared] } })) throw new ForbiddenException('El catálogo está compartido con otra empresa y no se puede modificar desde esta cuenta.');
  }
  const validarDatos = async (data: any) => {
    if (!data) return;
    if (Array.isArray(data)) { for (const row of data) await validarDatos(row); return; }
    if ('id_empresa' in scope) {
      if (data.id_empresa !== undefined && BigInt(data.id_empresa) !== actor.empresaId)
        throw new ForbiddenException('La empresa del registro no coincide con el perfil autenticado.');
      data.id_empresa = actor.empresaId;
    }
    // Every scalar FK is checked, including transaction writes and secondary relations.
    for (const field of modelos.get(model)?.fields || []) {
      if (field.kind !== 'object') continue;
      if (data[field.name] !== undefined) throw new ForbiddenException('Usa identificadores explícitos para modificar relaciones.');
      const relation = tenantRelations[model]?.find(r => r.name === field.name);
      const from = relation?.from || [];
      const to = relation?.to || [];
      if (!from.length || from.some((name) => data[name] == null)) continue;
      const where = Object.fromEntries(from.map((name, i) => [to[i], data[name]]));
      if (field.type === 'empresas' && where.id_empresa === actor.empresaId) continue;
      const targetScope = alcanceModelo(field.type, actor);
      if (!Object.keys(targetScope).length && !['distritos','provincias','departamentos'].includes(field.type)) continue;
      const exists = await base[field.type].findFirst({ where: { ...where, AND: targetScope } });
      if (!exists) throw new ForbiddenException(`Relación no autorizada: ${field.name}.`);
    }
  };
  if (['create','createMany','createManyAndReturn','update','updateMany','updateManyAndReturn'].includes(operation)) await validarDatos(args.data);
  if (operation === 'upsert') { await validarDatos(args.create); await validarDatos(args.update); }
  return args;
}
