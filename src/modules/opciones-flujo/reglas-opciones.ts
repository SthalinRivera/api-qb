import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
export const clienteValido = (
  empresa: bigint,
  ubigeo: string,
  tipo: string,
) => ({
  id_empresa: empresa,
  estado: true,
  cliente_distrito: {
    some: {
      id_empresa: empresa,
      id_ubigeo: ubigeo,
      estado: true,
      tipo_relacion: { in: [tipo, 'ambos'] },
    },
  },
});
export const lugarValido = (empresa: bigint, ubigeo: string) => ({
  id_ubigeo: ubigeo,
  estado: true,
  empresa_lugares: { some: { id_empresa: empresa, estado: true } },
});
export const puestoValido = (
  empresa: bigint,
  ubigeo: string,
  cliente: number | bigint,
) => ({
  estado: true,
  lugares_operativos: lugarValido(empresa, ubigeo),
  clientes_puestos: {
    some: {
      id_empresa: empresa,
      id_cliente: cliente,
      estado: true,
      fecha_fin: null,
      clientes: clienteValido(empresa, ubigeo, 'receptor'),
    },
  },
});
export const usuarioValido = (empresa: bigint, rol: string) => ({
  id_empresa: empresa,
  estado: true,
  usuarios_roles: { some: { roles_usuarios: { nombre: rol, estado: true } } },
});
export async function validarReceptor(
  db: any,
  empresa: bigint,
  destino: string,
  cliente: number | bigint,
  puesto: number | bigint,
  seccion?: string | null,
) {
  if (
    !(await db.puestos.findFirst({
      where: { id_puesto: puesto, ...puestoValido(empresa, destino, cliente) },
      select: { id_puesto: true },
    }))
  )
    throw new BadRequestException(
      'El receptor y su puesto deben estar activos y pertenecer al destino de la operación.',
    );
  if (
    seccion &&
    !(await db.clientes_puestos.findFirst({
      where: {
        id_empresa: empresa,
        id_cliente: cliente,
        id_puesto: puesto,
        estado: true,
        fecha_fin: null,
        seccion,
      },
      select: { id_cliente_puesto: true },
    }))
  )
    throw new BadRequestException(
      'La sección ya no corresponde al receptor y puesto seleccionados.',
    );
}

export async function destinosDisponibles(
  db: any,
  empresa: bigint,
  ubigeo?: string,
) {
  return db.$queryRaw(Prisma.sql`
    SELECT d.id_ubigeo, d.nombre FROM distritos d WHERE EXISTS (
      SELECT 1 FROM cliente_distrito cd
      JOIN clientes c ON c.id_cliente = cd.id_cliente AND c.id_empresa = ${empresa} AND c.estado = true
      JOIN clientes_puestos cp ON cp.id_cliente = c.id_cliente AND cp.id_empresa = ${empresa} AND cp.estado = true AND cp.fecha_fin IS NULL
      JOIN puestos p ON p.id_puesto = cp.id_puesto AND p.estado = true
      JOIN lugares_operativos l ON l.id_lugar = p.id_lugar AND l.estado = true AND l.id_ubigeo = d.id_ubigeo
      JOIN empresa_lugares el ON el.id_lugar = l.id_lugar AND el.id_empresa = ${empresa} AND el.estado = true
      WHERE cd.id_ubigeo = d.id_ubigeo AND cd.id_empresa = ${empresa} AND cd.estado = true AND cd.tipo_relacion IN ('receptor','ambos')
    ) ${ubigeo ? Prisma.sql`AND d.id_ubigeo = ${ubigeo}` : Prisma.empty} ORDER BY d.nombre
  `);
}
