import type { OpenAPIObject } from '@nestjs/swagger';
/** Document the same envelope returned by the global interceptor and filter. */
export function applyResponseContract(document: OpenAPIObject) {
  const properties = {
    success: { type: 'boolean' as const }, statusCode: { type: 'integer' as const }, message: { type: 'string' as const },
    data: { nullable: true }, meta: { type: 'object' as const, nullable: true, additionalProperties: true },
    errors: { nullable: true, description: 'Lista de errores de validación o detalles del error' },
  };
  for (const item of Object.values(document.paths)) for (const method of ['get','post','put','patch','delete'] as const) {
    const operation = item?.[method];
    if (!operation) continue;
    operation.security ??= [{ bearer: [] }];
    operation.responses ??= {};
    for (const code of ['400','401','403','404','409','500']) operation.responses[code] ??= { description: 'Error de solicitud' };
    for (const [code,response] of Object.entries(operation.responses)) {
      if (!response || '$ref' in response || code === '204') continue;
      const payload = response.content?.['application/json']?.schema;
      response.content = { 'application/json': { schema: {
        type: 'object', required: ['success','statusCode','message','data','meta','errors'],
        properties: { ...properties, ...(Number(code) < 400 && payload ? {data:payload} : {}) },
      } } };
    }
  }
  return document;
}
