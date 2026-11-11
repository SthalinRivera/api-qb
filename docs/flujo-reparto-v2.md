# Operaciones y reparto — contrato v2

Implementado el 10 de noviembre de 2026. Migración `202611100001_flujo_reparto` aplicada transaccionalmente y registrada en Prisma en la base configurada. No se alteraron estados ni documentos históricos.

## Secuencia

`pendiente → en_curso → en_transito → repartiendo → completado`.

No existe cancelación de operaciones. No hay saltos, retrocesos ni reapertura. La primera línea inicia preparación si la operación seguía pendiente al adquirir el bloqueo.

| Acción | Endpoint | Requisitos y efecto |
| --- | --- | --- |
| Crear | POST /operaciones-carga | Solo pendiente |
| Preparar | PATCH /operaciones-carga/:id/estado `{ "estado": "en_curso" }` | Pendiente con al menos una línea |
| Confirmar salida | POST /operaciones-carga/:id/finalizar | En curso, clasificación y destinos completos; pasa a en_transito |
| Emitir | POST /operaciones-carga/:id/generar-guias | En tránsito o reparto; sin cambiar estado |
| Iniciar reparto | PATCH /operaciones-carga/:id/estado `{ "estado": "repartiendo" }` | Desde tránsito; preparación completa y guías vigentes con cobertura |
| Cerrar | PATCH /operaciones-carga/:id/estado `{ "estado": "completado" }` | Desde reparto, conciliación completa y rol responsable |

El cierre corresponde a administrador, supervisor, encargado_carga o gerente. Una firma no cierra la operación. Después del cierre, cabecera, líneas, clasificación, asignaciones, guías, entregas y resoluciones no admiten edición ordinaria. La corrección extraordinaria de un cierre requiere un procedimiento auditado fuera de estas rutas; no existe una reapertura implícita.

## Empresa y permisos

Todas las solicitudes de negocio requieren Bearer validado por Supabase y un perfil activo inequívoco. `ENABLE_AUTH` no desactiva la autenticación. La empresa se obtiene del perfil, nunca del valor 1. Se verifica acceso al módulo por roles y módulos activos. Las lecturas de catálogos necesarias para operaciones también están autorizadas para usuarios operativos.

Los servicios usan `prisma.scoped`: incluye empresa en lecturas, agregaciones y escrituras; comprueba las claves relacionadas. Repartidores sin rol de supervisor/administrador solo acceden a operaciones asignadas y sus líneas, ítems, guías, entregas y resoluciones. Solo pueden iniciar el reparto y registrar/firmar entregas. Las consultas consolidadas y reportes basados en esas tablas reciben el mismo alcance.

Prisma 7 publica un DMMF reducido sin campos FK. `npm run security:generate` genera los metadatos de relaciones desde `schema.prisma`; se ejecuta en prebuild. No se permiten escrituras anidadas que eludan las comprobaciones.

## Cantidades, orden y correcciones

`detalle_carga.orden_carga` es entero positivo y único dentro de la operación. Si se omite, se usa el mayor orden + 1 bajo bloqueo. En las 18 líneas existentes se inicializó por `created_at NULLS LAST, id_detalle_carga`, empezando en 1 en cada operación.

Crear o cambiar una calidad no la asigna a ningún ítem. La asignación se realiza explícitamente con `id_detalle_carga`, `id_item_reparto` y `id_detalle_carga_calidad`.

- POST /items-reparto/from-calidades y /from-calidades-multiple crean asignaciones con desglose.
- PUT /items-reparto/:id/asignacion reemplaza explícitamente el desglose, usando el contrato de creación con detalles; valida pertenencia de todas las calidades, saldos por calidad y total de línea.
- PUT /items-reparto/:id permite ajustar destinos directos sin saltarse el saldo.
- Las operaciones de clasificación, asignación, emisión, recepción y cierre bloquean la misma fila de operación. Los saldos se consultan nuevamente dentro del bloqueo.

Se admiten correcciones durante tránsito y reparto. Si hay guía vigente, se anula antes de corregir. Si hay entrega física o resolución, no se reescriben cantidades ni destinos históricos. Los controles de deudas de jabas ya pagadas también se conservan.

## Cobertura de guías

Una guía cubre exactamente **un ítem completo**, no cantidades parciales ni varios ítems. Las entregas sí pueden ser parciales.

`GET /guias-operativas/:id` devuelve `cobertura` persistida, con `version: 1`, `tipo: item_completo`, identificadores, cantidad, receptor, puesto, producto, variedad, emisor, tipo de jaba y calidades/precios. `cobertura.documento` conserva la copia utilizada por la vista/PDF, incluidos cabecera, empresa y repartidor al emitir.

Los reintentos devuelven la guía vigente. Un bloqueo de operación y un índice único parcial impiden guías vigentes duplicadas para un mismo ítem. Si se anula sin entregas, una nueva emisión crea la siguiente versión, conservando la anterior. Nuevos ítems válidos pueden emitirse durante reparto. Una guía con entregas no se anula ni reemplaza mediante edición ordinaria.

Las **3 guías anteriores a la migración** mantienen `cobertura: null`. La vista las identifica como históricas sin cobertura verificada; no se les inventó un snapshot con datos actuales. El servidor no permite nuevas entregas contra ellas. Si no tienen entregas y la operación está abierta, pueden anularse y emitirse nuevamente. Con movimientos físicos requieren revisión documental de la evidencia original; no existe un botón que certifique información histórica sin esa revisión.

## Recepciones y resoluciones

POST /entregas recibe `id_item_reparto` e `id_guia`; por compatibilidad, si se omite la guía se busca la vigente del ítem. Siempre se valida pertenencia, vigencia y cobertura persistida. Solo se recibe en estado repartiendo. Las cantidades recibidas acumulan y no pueden superar el saldo físico ni documental. No se crean guías al entregar.

La firma de recepción, el estado documental y el resultado de la entrega son independientes. La deuda de jabas por cobrar se genera por la cantidad efectivamente recibida y solo para jabas retornables.

Un rechazo es un intento fallido: no descuenta definitivamente el saldo. Puede registrarse otra entrega posterior. Para devolución o merma se usa:

```json
POST /items-reparto/123/resoluciones
{
  "tipo": "devolucion",
  "cantidad": 2,
  "motivo": "Producto devuelto al origen",
  "clave_idempotencia": "4f811bd7-1306-471d-b9fc-2e6c276ab070"
}
```

`tipo` admite `devolucion` o `merma`. Se requiere rol responsable, cantidad positiva, motivo y UUID. El registro es inmutable, incluye usuario/empresa y es idempotente para la misma solicitud. Reutilizar la clave con otro contenido se rechaza. El saldo conciliado es asignado − recibido − devuelto − merma. Una resolución no equivale a recepción firmada ni genera una deuda de jabas recibidas.

La reasignación antes de movimientos físicos requiere anular la guía y reajustar explícitamente el ítem. Después de un movimiento, se conserva el destino original: registrar devolución y, si vuelve a salir, una nueva carga documentada. No se traslada retrospectivamente lo entregado a otro cliente.

## Consultas y métricas

`GET /operaciones-carga/resumen-repartos?estado=en_transito&fecha=2026-11-10&page=1&limit=20`

Respuesta: `{ data: [ { ...cabecera, camiones, sedes_..., resumen } ], total, page, limit }`. Una fila por operación. Página desde 1; límite por defecto 20, máximo 100. Estado es uno de los cinco anteriores; fecha ISO. Omitir filtros devuelve las operaciones visibles para el perfil.

`GET /operaciones-carga/:id/reparto` devuelve cabecera, `detalle_carga` ordenada, calidades, ítems, desgloses, guías, entregas, resoluciones y el mismo `resumen`. El campo `flujo` anterior se conserva para mensajes de compatibilidad; la autoridad para avanzar/cerrar es `resumen`.

El resumen incluye `lineas` con saldos y excesos locales, `jabasCargadas`, `jabasAsignadas`, `jabasSinAsignar`, `excesosAsignacion`, `jabasSinClasificar`, `excesosClasificacion`, `excesosCalidad`, `desglosesIncompletos`, `destinosIncompletos`, `puestosDistintos`, `totalItems`, `itemsResueltos`, `saldoEntrega`, `excesosEntrega`, `progreso`, `preparada`, `conciliada`.

Se cuenta la carga una vez por línea y la asignación una vez por ítem. Un exceso no compensa el faltante de otra línea/calidad. Directas no requieren clasificación; mixtas y líneas con calidades sí validan el desglose. El progreso se basa en ítems resueltos, no en guías firmadas. La conciliación exige preparación válida y todos los ítems resueltos exactamente.

## Catálogos e historial

GET /puestos admite `estado=true|false|todos`, `id_sede`, `id_lugar`, `tipo_lugar`, `buscar`, combinados y limitados a la empresa. Las consultas por mercado también están limitadas. Por ahora **solo mercados admiten crear o trasladar puestos**; no se amplía a tipos de lugar sin una regla de negocio.

GET /clientes admite `id_sede`, `tipo_relacion`, `buscar`, `estado`, `page`, `limit`. Sede y tipo se aplican a la misma relación activa. Receptor/emisor incluyen ambos; tipo ambos exige ambos. `activos` e `inactivos` respetan empresa/sede/tipo/búsqueda; `total` respeta además el estado solicitado.

Eliminar una ocupación marca `estado=false, fecha_fin=ahora`. Actualizar el cliente completo hace lo mismo para las ocupaciones retiradas y conserva las que siguen vigentes. Reocupar crea otra fila. GET /clientes/:id/puestos devuelve vigentes con `id_cliente_puesto`; el detalle completo conserva las relaciones con sus fechas/estado. DELETE /clientes/:id/puestos/:puestoId acepta `id_cliente_puesto`; si hay varias ocupaciones vigentes y se omite, se rechaza por ambigüedad.

Ubigeo: GET /ubigeo/departamentos; /provincias?id_departamento=15; /distritos?id_provincia=1501, opcional `id_departamento` y `buscar`. IDs como cadenas con ceros iniciales (2/4/6 dígitos). Se admiten distritos válidos en operaciones (origen/destino), lugares operativos y relaciones cliente-sede.

## Rutas retiradas

Se retiró DELETE /operaciones-carga/:id (cancelación). Se comprobó que el frontend no consumía el alias POST /operaciones-carga/:id/generar-guias-por-puesto ni POST /items-reparto/:id/detalle, PUT/DELETE /items-reparto/detalle/:detalleId, que solo rechazaban cambios. Ahora se usa la asignación explícita. No se eliminaron rutas solo por desconocer consumidores externos.

## Migración y verificación

Antes de aplicar: auditoría de estados, guías duplicadas y relaciones cruzadas. Se encontraron 4 en curso, 3 pendientes, 2 en tránsito y 1 completada; ninguna en repartiendo. No fue necesario reclasificar estados. Sin duplicados de guías vigentes ni cruces en las relaciones auditadas.

- `scripts/check-reparto-migration.cjs`: probó el SQL sobre copias temporales antes de aplicarlo. Es una comprobación previa; no repetir contra un esquema ya migrado.
- `scripts/apply-reparto-migration.cjs`: aplicación transaccional para esta base preexistente, con timeout y validación; rechaza repetir si la columna ya existe.
- Se registró después con `prisma migrate resolve --applied 202611100001_flujo_reparto` y se regeneró el cliente.
- `scripts/check-tenant-scope.cjs`: integración de solo lectura para aislamiento y consultas consolidadas con Prisma real.
- 58 pruebas unitarias aprobadas: estados, guías, cantidades, métricas, permisos y validación de relaciones. No equivalen a una prueba de carga con múltiples usuarios reales.
- Servidores locales iniciados en 3000/4000. Operaciones, clientes, entregas y ubigeo retornan 401 sin Bearer.
- Build de Next y API; comprobación TypeScript. No se realizó una sesión visual autenticada de extremo a extremo.

La migración es aditiva, específica para la base existente. No usar `migrate reset` ni `db push` para sustituirla. Para provisionar una base vacía hace falta la línea base del esquema anterior y luego esta migración.
