// common/interceptors/decimal.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class DecimalInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => this.transformDecimals(data)),
        );
    }

    /**
     * Recorre recursivamente el objeto/array y convierte:
     * - Objetos Decimal de Prisma (con { s, e, d }) a número.
     * - Objetos Date a string ISO.
     */
    private transformDecimals(value: any): any {
        if (value === null || value === undefined) return value;

        // 🔹 1. Si es un Date, convertirlo a ISO string
        if (value instanceof Date) {
            return value.toISOString();
        }

        // 🔹 2. Si es un objeto Decimal de Prisma
        if (this.isDecimalObject(value)) {
            return this.decimalToNumber(value);
        }

        // 🔹 3. Si es un arreglo, procesar cada elemento
        if (Array.isArray(value)) {
            return value.map((item) => this.transformDecimals(item));
        }

        // 🔹 4. Si es un objeto, procesar cada propiedad
        if (typeof value === 'object') {
            const result: any = {};
            for (const key of Object.keys(value)) {
                result[key] = this.transformDecimals(value[key]);
            }
            return result;
        }

        // 🔹 5. Cualquier otro valor se devuelve tal cual
        return value;
    }

    private isDecimalObject(obj: any): boolean {
        return (
            obj &&
            typeof obj === 'object' &&
            's' in obj &&
            'e' in obj &&
            'd' in obj &&
            Array.isArray(obj.d) &&
            typeof obj.s === 'number' &&
            typeof obj.e === 'number'
        );
    }

    private decimalToNumber(decimal: any): number {
        // Si el objeto tiene el método toNumber(), usarlo (más fiable)
        if (typeof decimal?.toNumber === 'function') {
            return decimal.toNumber();
        }

        // Si tiene toString(), parsearlo (alternativa)
        if (typeof decimal?.toString === 'function') {
            const str = decimal.toString();
            const num = parseFloat(str);
            if (!isNaN(num)) return num;
        }

        // Fallback: conversión manual
        const sign = decimal.s;
        const exponent = decimal.e;
        const digits = decimal.d.join('');
        const numberPart = parseFloat(digits);
        const value = numberPart * Math.pow(10, exponent);
        return value * sign;
    }
}