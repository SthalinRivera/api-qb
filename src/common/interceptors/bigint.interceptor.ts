import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function convertBigInts(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof obj === 'bigint') return Number(obj); // o .toString() si prefieres string
    if (Array.isArray(obj)) return obj.map(convertBigInts);
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = convertBigInts(value);
    }
    return result;
}

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(map(data => convertBigInts(data)));
    }
}