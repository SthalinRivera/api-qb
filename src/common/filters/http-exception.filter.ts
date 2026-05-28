import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status = exception instanceof HttpException ? exception.getStatus() : 500;

        let message = 'Error interno del servidor';
        if (exception instanceof HttpException) {
            const res = exception.getResponse();
            message = typeof res === 'string' ? res : (res as any).message;
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            message: message,
            timestamp: new Date().toISOString(),
        });
    }
}