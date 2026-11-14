# Opciones del flujo operativo

## Cambios

- `GET /auth/session`: identidad, empresa y menú autorizado para abrir el dashboard. El perfil ampliado permanece en `/auth/profile` y se pide desde la pantalla de perfil. El callback OAuth usa `/auth/check`; ya no descarga y desecha el perfil. Las consultas concurrentes de sesión se comparten por token.
- `GET /opciones-flujo/operacion?origen=150101`: orígenes con emisores activos, destinos con receptores y ocupaciones activas, camiones activos y responsables con el rol correspondiente. Sin origen no se ofrecen destinos.
- `GET /opciones-flujo/carga?operacion=ID&fruta=ID&cliente=ID&puesto=ID`: emisores del origen, receptores del destino, frutas y tipos de jaba activos, variedades de la fruta, puestos del receptor en el destino y secciones de esa ocupación. Los IDs dependientes son opcionales; no se descargan variedades, puestos ni secciones sin sus selecciones padre.
- `GET /opciones-flujo/reparto?operacion=ID&detalle=ID&cliente=ID`: producto de esa operación, cantidades de calidad aún asignables calculadas en SQL, receptores y puestos válidos. Se eliminó el fallback a receptores de otras ubicaciones.
- `GET /opciones-flujo/calidades?detalle=ID&calidad=ID`: calidades activas no usadas en el producto; `calidad` identifica la fila que se está editando.
- `GET /opciones-flujo/clasificacion?operacion=ID&detalle=ID`: agrupa el producto, sus calidades, opciones disponibles y estado de clasificación para la pantalla alternativa.
- `GET /opciones-flujo/operaciones?buscar=texto`: datos mínimos de cargas abiertas para preparar entregas, con búsqueda en la base de datos.
- `GET /opciones-flujo/entrega?operacion=ID&item=ID`: únicamente destinos con saldo pendiente y guía vigente de una operación en reparto. El saldo resta lo recibido y las resoluciones, sin considerar los rechazos como recibidos. No devuelve el documento histórico completo de la guía.

Todos los endpoints pasan por la autenticación y los permisos globales. La empresa procede del contexto autenticado; el cliente no puede escogerla. Las consultas Prisma usan `scoped`; las consultas SQL parametrizadas incluyen la empresa y comprueban previamente el acceso a la operación (incluido el repartidor asignado).

El esquema no contiene una relación de rutas origen–destino. Se respetan las relaciones existentes de `cliente_distrito`, `clientes_puestos`, `lugares_operativos` y `empresa_lugares`; no se inventan restricciones geográficas adicionales ni una prohibición de operar dentro del mismo distrito.

## Guardados y frontend

Los formularios envían los IDs seleccionados y consumen las opciones del servidor. Limpian los descendientes al cambiar origen, fruta, receptor o puesto, descartan respuestas obsoletas y bloquean el guardado mientras las opciones están cargando o fallaron. Solo se comparten peticiones de opciones simultáneas de la misma empresa/usuario; no queda una caché permanente de catálogos.

Los guardados vuelven a validar estado y pertenencia de emisor, fruta–variedad, jaba, responsables, receptor–puesto–sección. Los cambios de ruta se comprueban contra los productos y destinos existentes bajo el bloqueo de la operación. Se conserva la relectura de cantidades, guía y saldo bajo transacción para impedir sobreasignaciones y entregas excesivas. Las ediciones parciales validan la combinación de los datos persistidos y recibidos.

Se retiraron recargas de listas completas de los hooks después de crear/editar productos y asignar reparto: la pantalla propietaria refresca su operación. La edición de entrega utiliza sus IDs existentes y no descarga catálogos.

## Medición

Lectura reproducible de una empresa de la base configurada, comparando los servicios anteriores (que permanecen disponibles para sus pantallas de administración) con las nuevas opciones. Son bytes JSON sin compresión, sin cabeceras HTTP; no son mediciones del navegador ni de latencia. Resultados en `opciones-flujo-medicion.json`.

| Apertura del formulario | Peticiones antes | Después | Bytes antes | Después |
| --- | ---: | ---: | ---: | ---: |
| Operación | 3 | 1 | 403299 | 793 |
| Producto de carga | 4 | 1 | 33876 | 1335 |
| Reparto, producto ya seleccionado | 4 | 1 | No medido | No medido |
| Edición de entrega | 3 | 0 | No medido | 0 |
| Clasificación, pantalla alternativa | 5 | 1 | No medido | No medido |

Elegir un origen agrega una petición contextual de 838 bytes en esta muestra: apertura más selección son 2 peticiones y 1631 bytes, frente a 3 peticiones y 403299 bytes anteriores. Elegir fruta, receptor o puesto también consulta sus opciones actualizadas; estas peticiones sustituyen el filtrado local. En reparto, elegir receptor agrega una petición: 2 en total frente a las 4 iniciales anteriores.

Guardar reparto pasa de POST + lista completa de ítems + lista completa de pendientes + operación a POST + operación. Guardar un producto elimina la lectura adicional de todos sus detalles antes del refresco de la pantalla.

## Verificación reproducible

Desde el backend:

```
npm test -- --runInBand
npm run build
node scripts/measure-options.cjs
node scripts/verify-options-flow.cjs
```

`measure-options.cjs` solo lee. `verify-options-flow.cjs` usa servicios reales dentro de una transacción que siempre revierte: sesión mínima, creación, clasificación, asignación, confirmación, guía, inicio de reparto, entrega parcial, rechazo de cantidad obsoleta, entrega final y cierre. Comprueba que no persista la operación de prueba. Las secuencias PostgreSQL pueden avanzar. Requiere una empresa con catálogos y relaciones activas. Resultado en `opciones-flujo-verificacion.json`.

Desde el frontend:

```
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run build
```

En este entorno la descarga de Google Fonts necesita `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`; no se desactivó la verificación TLS ni se cambió la configuración del proyecto.

La prueba transaccional verifica servicios, consultas y escrituras reales. No automatiza el consentimiento de Google ni los clics de un navegador autenticado.
