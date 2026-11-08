# Proceso de Operaciones

Revisión del 8 de noviembre de 2026. Se inspeccionaron Prisma, las restricciones reales de PostgreSQL, los servicios de carga/calidad/reparto/entrega/guías y las pantallas que los consumen. La auditoría de la base fue de solo lectura; no se ejecutaron migraciones ni se modificaron registros existentes.

## Secuencia para el usuario

1. Crear carga y agregar productos.
2. Si el producto tiene reparto, clasificar todas sus jabas por calidad. Las entregas directas no requieren clasificación. Asignar receptor y puesto a todas las cantidades.
3. Confirmar la carga. Esta acción valida cantidades y destinos en el servidor y bloquea la edición de los productos.
4. Registrar entregas totales o parciales desde la misma operación, indicando cantidades recibidas, rechazadas y quién recibe.
5. Revisar el historial y consultar las guías de cada destino.

El avance se obtiene de la API y de sus registros, no de una variable de navegación temporal. El estado `completado` se alcanza cuando todas las jabas asignadas fueron recibidas; un rechazo no equivale a una entrega completa.

## Compatibilidad con la base existente

- PostgreSQL acepta `pendiente`, `en_curso`, `en_transito`, `repartiendo`, `completado` y `cancelado`. Se corrigieron nombres incompatibles en las acciones del flujo.
- `entregas.id_guia` sigue siendo obligatorio en la base. El formulario ya no lo solicita: la API genera o reutiliza la guía del destino dentro de la transacción de entrega. `POST /entregas` admite omitir `id_guia`; si se envía, debe pertenecer al mismo destino.
- Cada guía muestra únicamente su destino. Se retiró la agrupación implícita de todos los clientes que compartían un puesto.
- Se preserva la política original de jabas: deuda al emisor al cargar y cuenta por cobrar al receptor al entregar. La entrega no vuelve a crear la deuda del emisor. La cuenta por cobrar usa solo la cantidad realmente recibida.
- Las cantidades registradas en entregas no se reescriben desde un cambio rápido de estado o una firma. El saldo se registra con otra entrega.
- Se usan transacciones y bloqueo de la operación para confirmar carga, clasificar, asignar múltiples destinos y registrar entregas, evitando competir por el mismo saldo en esas acciones.

## Presentación

Las pantallas de Operaciones comparten un ancho máximo de 1200 px, títulos consistentes, controles compactos y tarjetas con separación uniforme. Los cinco pasos tienen igual ancho y altura. En pantallas estrechas el indicador permite desplazamiento horizontal.

## Auditoría de registros anteriores

La consulta encontró cero entregas vinculadas a una guía de otro destino y cero destinos con cantidades recibidas por encima de lo asignado. Hay siete cuentas por pagar sin entrega vinculada: esto es compatible con la política de registrar la deuda durante la carga, no demuestra por sí solo un error. No se reconciliaron ni eliminaron esos saldos.

Las cargas antiguas con retorno de jabas y sin una referencia inequívoca a su deuda requieren revisar ese saldo antes de eliminarlas. No se deduce una asociación basándose solamente en que coincidan emisor y cantidad.

La auditoría puede repetirse desde la carpeta de la API con `node scripts/audit-operation-workflow.cjs`. Utiliza la conexión configurada y ejecuta únicamente consultas de lectura.

## Verificación y puesta en uso

- Compilación de la API y 27 pruebas automatizadas aprobadas: clasificación condicional, destinos, transiciones, entregas parciales, saldos, guía incorrecta, duplicación de entrega completa y retorno de jabas.
- TypeScript del frontend y lint de los componentes nuevos aprobados.
- Compilación de producción del frontend aprobada. La descarga de Outfit requirió ejecutar con `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` para utilizar los certificados TLS del sistema; no se desactivó la validación TLS.
- El navegador integrado no pudo abrir la aplicación; falta una comprobación visual con sesión iniciada y una prueba integral en un entorno de pruebas.

Actualizar tanto la API como el frontend. Si no están ejecutándose con recarga automática, reiniciar ambos procesos. El cambio no requiere alterar el esquema de Prisma.
