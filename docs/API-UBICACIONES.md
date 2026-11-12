# API y migración a ubicaciones

Revisión del 12 de noviembre de 2026. Se contrastó el esquema local con la base configurada, sin exportar datos personales. El esquema Prisma modificado previamente por el usuario se conservó y se regeneró el cliente.

## Cambios de esquema utilizados

| Antes | Ahora |
| --- | --- |
| usuarios.id_sede | usuarios.id_ubigeo (texto obligatorio de seis dígitos) |
| operaciones_carga.id_sede_origen / id_sede_destino | id_ubigeo_origen / id_ubigeo_destino (ambos obligatorios) |
| cliente_sede | cliente_distrito |
| cliente_sede.id_sede | cliente_distrito.id_ubigeo |
| lugares_operativos.id_empresa / id_sede | empresa_lugares + lugares_operativos.id_ubigeo |
| puestos.id_empresa | vínculo al lugar y sus empresas |
| puestos.numero_puesto | puestos.codigo_puesto |

Las ubicaciones son distritos del catálogo geográfico compartido, relacionados con provincias y departamentos. No tienen los campos tipo_sede, empresa, estado o dirección de las antiguas sedes. Los lugares físicos (mercado, almacén, etc.) siguen administrándose mediante lugares-operativos.

## Contrato HTTP para web y móvil

Todas las respuestas JSON de los controladores tienen las mismas claves:

```json
{"success":true,"statusCode":200,"message":"Operación exitosa","data":[],"meta":null,"errors":null}
```

- Un listado devuelve un array en data; un detalle devuelve un objeto; una acción sin resultado devuelve null.
- Los listados paginados tienen el array en data y total, page, limit y demás contadores en meta. Se conserva la paginación existente de cada recurso.
- Los errores devuelven success=false, data=null, meta=null y errors con los detalles de validación cuando corresponda. Los fallos internos no revelan SQL ni trazas.
- Los IDs en respuestas son cadenas; los códigos de departamento, provincia y ubigeo también son cadenas y conservan ceros iniciales. Los DTOs de entrada de IDs numéricos existentes conservan su formato numérico. Ubigeos siempre deben enviarse como texto.
- Los Decimal se serializan como números. Las fechas civiles usan YYYY-MM-DD, las horas HH:mm:ss y las marcas de tiempo ISO 8601 UTC.
- Autenticación: Authorization: Bearer <access_token de Supabase>. La empresa se verifica contra el usuario autenticado; nunca se permite usar otra empresa mediante el cuerpo o los filtros.
- La web adapta el sobre y los IDs seguros en fetchWithAuth. Una aplicación móvil debe leer directamente data/meta y conservar los IDs como texto.
- OpenAPI: /api/docs y docs/openapi.json. FRONTEND_URL admite una lista de orígenes web separados por comas.

## Endpoints de ubicaciones

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | /ubicaciones | Distritos; filtros buscar, id_provincia, id_departamento |
| GET | /ubicaciones/departamentos | Departamentos |
| GET | /ubicaciones/provincias?id_departamento=01 | Provincias |
| GET | /ubicaciones/distritos?id_provincia=0101 | Distritos |
| GET | /ubicaciones/010101 | Detalle de distrito |
| GET | /clientes/:id/ubicaciones | Relaciones del cliente |
| POST | /clientes/ubicaciones | Crear relación con id_cliente, id_ubigeo, tipo_relacion |
| PATCH | /clientes/:id/ubicaciones/:relacionId | Cambiar tipo_relacion |
| DELETE | /clientes/:id/ubicaciones/:relacionId | Eliminar una relación específica |
| GET | /lugares-operativos/ubicaciones/:ubigeo/lugares | Lugares vinculados a la empresa en ese distrito |
| GET | /reportes/clientes-por-ubicacion | Reporte; filtro id_ubigeo |

relacionId es id_cliente_distrito, NO el ubigeo. Esto distingue los roles emisor y receptor del mismo cliente en un mismo distrito. Para ambos roles se registran dos relaciones; no se envía tipo_relacion=ambos al crear. El filtro de clientes tipo_relacion=ambos busca los dos roles.

Los formularios full de clientes envían ubicaciones: [{ id_ubigeo: "010101", tipo_relacion: "emisor" }]. Los usuarios envían id_ubigeo; las operaciones envían id_ubigeo_origen e id_ubigeo_destino. El perfil devuelve id_ubigeo y ubicacion, con provincia y departamento.

La ruta /ubigeo sigue disponible como alias de lectura. El antiguo CRUD /sedes se retiró. La web redirige /dashboard/sedes hacia /dashboard/ubicaciones y traduce los permisos de navegación antiguos sin modificar las filas de módulos.

## Lugares compartidos y seguridad

Crear un lugar existente por ubigeo/nombre vincula ese lugar con la empresa sin sobrescribir el catálogo compartido. estado representa la activación del vínculo con la empresa; estado_catalogo conserva el estado global. Los cambios de estado no desactivan el lugar para otras empresas. La modificación del catálogo se rechaza si está compartido con otra empresa. Las consultas de puestos y lugares se limitan mediante empresa_lugares y las listas relacionadas se filtran por empresa.

## Corrección aplicada a la base

Se aplicó de manera transaccional el SQL de prisma/migrations/202611120001_ubicaciones_constraints/migration.sql. Se eliminaron únicamente chk_tipo_recuperacion y recuperacion_tipo_check: ambas reglas heredadas contradecían recuperaciones_jabas_tipo_recuperacion_check. Esta última y la restricción de cantidad permanecen. La tabla estaba vacía; no se borraron ni transformaron registros. El SQL es repetible y no se ejecutaron las demás migraciones históricas ni db push. La aplicación directa de este SQL no registra por sí sola una entrada en _prisma_migrations.

## Ejecución y validación

Backend: npm run build, npm test -- --runInBand, npm run start:prod. El build y start:dev regeneran Prisma y los metadatos de relaciones para evitar un cliente desactualizado. start:prod apunta a dist/src/main.js.

Verificación de lectura: npm run verify:schema y npm run verify:endpoints después de compilar. La segunda usa un guard de Supabase simulado únicamente dentro del proceso de pruebas y un perfil administrador real; NO desactiva autenticación en la aplicación ni prueba el flujo OAuth de Google. Revisa los informes JSON en docs. Las rutas con ID se comprueban con un ID de prueba; un 404 puede indicar ausencia del registro.

Frontend: npx tsc --noEmit y npm run build. En este equipo la descarga de Google Fonts requirió NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1. No se modificó el diseño ni se desactivó la verificación TLS.

Reiniciar los procesos después del build; la web y la API deben desplegarse juntas por el cambio del contrato. No se realizó un despliegue remoto.
