import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => this.convertBigInt(data)),
        );
    }

    private convertBigInt(value: any): any {
        if (value === null || value === undefined) return value;
        if (typeof value === 'bigint') {
            // Convertir a número (puedes usar String si prefieres)
            return Number(value);
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.convertBigInt(item));
        }
        if (typeof value === 'object') {
            const newObj: any = {};
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    newObj[key] = this.convertBigInt(value[key]);
                }
            }
            return newObj;
        }
        return value;
    }
}