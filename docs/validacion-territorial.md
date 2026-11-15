# Validación territorial y asociaciones de establecimientos

## Revisión previa (15 de noviembre de 2026)

- POST /operaciones-carga ya exigía strings de seis dígitos en ambos UBIGEO mediante el DTO. No comprobaba desigualdad ni consultaba explícitamente la existencia de ambos distritos.
- PUT /operaciones-carga/:id ya combinaba datos almacenados y cambios dentro de una transacción con SELECT FOR UPDATE. Solo permite editar en pendiente/en_curso. PATCH /:id/estado modifica únicamente el estado.
- Existían validaciones adicionales de emisores, receptores/puestos, camión y responsables; se conservan.
- El DTO parcial permitía null en campos territoriales; ahora omitirlos sigue permitido, pero null se rechaza.
- GET /lugares-operativos?estado=true ya consulta asociaciones de la empresa y devuelve distritos. POST crea/vincula por nombre y UBIGEO, y PATCH /:id/estado cambia el estado del vínculo. Faltaba seleccionar por ID un lugar existente aún no asociado.
- La API y las restricciones de PostgreSQL permitían UBIGEO iguales si se cumplían las demás reglas.

Se consultó la conexión DATABASE_URL configurada usando BEGIN READ ONLY y ROLLBACK:

```sql
SELECT count(*) FROM public.operaciones_carga
WHERE id_ubigeo_origen = id_ubigeo_destino;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.operaciones_carga'::regclass;
```

Resultado histórico: **0 operaciones incompatibles** al momento de la consulta. Se encontraron ambas FK hacia distritos, la PK, la unicidad empresa/operación, las FK de camión/empresa/responsables y el CHECK de estados. No existe CHECK de desigualdad territorial. El resultado se comunicó antes de implementar. No se ejecutaron migraciones ni escrituras de datos.

## Operaciones

Se mantienen POST y PUT (parcial). Los UBIGEO son strings para preservar ceros iniciales. Se validan formato, existencia en distritos y desigualdad por identificador. PUT combina ambos valores finales dentro de la transacción bloqueada antes de escribir cualquier cambio; no permite modificaciones fuera de pendiente/en_curso.

HTTP 400 para igualdad:

```json
{"message":"El distrito de origen y el distrito de destino deben ser diferentes."}
```

El mensaje se devuelve dentro del contrato de error existente de la API. No se requiere id_lugar ni se agrega tipo_sede o un rol territorial permanente a los establecimientos.

## Contrato para Flutter

Reutilizar **GET /ubicaciones/distritos?empresa=true** (también disponible bajo /ubigeo). No se agrega otra ruta de zonas. El filtro opcional conserva el comportamiento global de consultas anteriores.

- Empresa: contexto autenticado, nunca un parámetro id_empresa.
- Devuelve distritos únicos con al menos un lugar operativo activo y una asociación empresa_lugares activa.
- Admite los filtros existentes id_provincia, id_departamento y buscar.
- Respuesta: envoltura habitual success/statusCode/message/data/meta/errors. data es un array con id_ubigeo, nombre, id_provincia y provincias (incluyendo departamentos).
- Sin asociaciones activas: data es [].
- Los IDs UBIGEO permanecen strings.

Flutter puede mostrar `nombre — provincia, departamento (id_ubigeo)`, seleccionar origen, excluir ese identificador del destino y validar nuevamente antes de enviar POST/PUT. La API mantiene su validación independiente.

Los requisitos previos sobre emisores y receptores siguen vigentes: las zonas asociadas no garantizan por sí solas que haya clientes/puestos habilitados. GET /opciones-flujo/operacion?origen=150507 sigue siendo el contrato de opciones listas para registrar una operación, usado actualmente por Next.js.

## Administración de empresa_lugares

Se amplía el módulo existente lugares-operativos para evitar CRUD redundante:

- **GET /lugares-operativos/catalogo/:ubigeo**: administrador; catálogo global activo del distrito, mostrando únicamente el estado de la asociación de su propia empresa. No expone asociaciones ajenas.
- **PUT /lugares-operativos/:id/asignacion**, body `{ "estado": true }`: administrador; asigna o reactiva mediante upsert por empresa/lugar. Con false desactiva la asociación. No cambia el catálogo compartido ni elimina vínculos.
- Empresa obtenida exclusivamente del contexto autenticado. Un usuario no administrador recibe 403; lugar inexistente o inactivo al activar recibe 404.
- Las rutas anteriores de consulta, creación y cambio de estado mantienen sus contratos.

Frontend Next.js: panel **Asignar establecimientos a mi empresa** dentro de /dashboard/lugares-operativos, visible para administradores. Busca distritos por nombre (mínimo tres caracteres), muestra provincia/departamento/UBIGEO y permite asignar o desactivar establecimientos. No descarga todos los distritos al abrir la pantalla. Los formularios de creación y edición de operaciones excluyen el origen del selector de destino y bloquean envíos iguales.

## Archivos principales

Backend:
- src/modules/operaciones-carga/operaciones-carga.service.ts
- src/modules/operaciones-carga/dto/update-operaciones-carga.dto.ts
- src/modules/ubigeo/ubigeo.controller.ts
- src/modules/lugares-operativos/lugares-operativos.controller.ts
- src/modules/lugares-operativos/lugares-operativos.service.ts
- Nuevas pruebas territorio.spec.ts, ubigeo.controller.spec.ts y asignacion.spec.ts.

Frontend:
- src/components/lugares-operativos/EmpresaLugaresPanel.tsx
- src/components/lugares-operativos/LugarOperativoTable.tsx
- src/components/operaciones-carga/OperacionCargaModal.tsx
- src/app/dashboard/(admin)/operaciones-carga/nueva/page.tsx

## Verificación

- Backend: `npx jest --runInBand`: 19 suites y 141 pruebas aprobadas.
- Backend: `npx tsc --noEmit -p tsconfig.build.json`: aprobado.
- Frontend: `npx tsc --noEmit --incremental false`: aprobado.
- El comando genérico tsc del backend incluye tests sin los tipos Jest configurados; se utilizó la configuración de build para producción y Jest para comprobar las pruebas.
- No se realizó una prueba interactiva del navegador ni una escritura de integración en PostgreSQL.

## CHECK propuesto, no aplicado

Sería conveniente añadir defensa a nivel PostgreSQL. No se creó una migración automática. Antes de aplicarlo debe repetirse la consulta histórica porque pueden aparecer nuevos registros entre revisión y despliegue. SQL propuesto para una intervención revisada:

```sql
ALTER TABLE public.operaciones_carga
ADD CONSTRAINT operaciones_carga_ubigeos_distintos_check
CHECK (id_ubigeo_origen <> id_ubigeo_destino);
```

Este SQL es solo documentación y no se ejecutó. No modifica las tablas geográficas.
