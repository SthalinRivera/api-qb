import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { map } from 'rxjs/operators';
export function serializeApi(value: any, key = ''): any {
  if (value == null) return value ?? null;
  if (typeof value === 'number' && /^id(?:_|$)/.test(key)) return String(value);
  if (typeof value === 'bigint') return value.toString();
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  if (value instanceof Date) {
    const iso = value.toISOString();
    return key.startsWith('fecha_') ? iso.slice(0, 10) : key.startsWith('hora_') ? iso.slice(11, 19) : iso;
  }
  if (Array.isArray(value)) return value.map(item => serializeApi(item));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, serializeApi(v,k)]));
  return value;
}
export function apiSuccess(payload: any, statusCode: number) {
  const paginated = payload && Array.isArray(payload.data) && typeof payload.total === 'number' && typeof payload.page === 'number';
  const { data, ...meta } = paginated ? payload : { data: payload ?? null };
  return serializeApi({ success: true, statusCode, message: 'Operación exitosa', data, meta: paginated ? meta : null, errors: null });
}
@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(data => apiSuccess(data, context.switchToHttp().getResponse().statusCode)));
  }
}
