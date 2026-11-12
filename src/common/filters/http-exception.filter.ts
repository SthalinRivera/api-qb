import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { serializeApi } from '../interceptors/api-response.interceptor';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let statusCode = 500, message = 'Error interno del servidor';
    let errors: any = null;
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const detail = exception.getResponse();
      const body = typeof detail === 'string' ? { message: detail } : detail as any;
      message = Array.isArray(body.message) ? 'Solicitud inválida' : body.message || exception.message;
      errors = Array.isArray(body.message) ? body.message : Object.fromEntries(Object.entries(body).filter(([k]) => !['message','statusCode','error'].includes(k)));
      if (!Array.isArray(errors) && !Object.keys(errors).length) errors = null;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const known: Record<string, [number, string]> = { P2002: [409,'El registro ya existe'], P2003: [409,'La relación solicitada no es válida'], P2025: [404,'Registro no encontrado'], P2004: [400,'Los datos incumplen una restricción'] };
      [statusCode, message] = known[exception.code] || [500, message];
    }
    if (statusCode >= 500) this.logger.error(exception instanceof Error ? exception.stack : 'Error desconocido');
    response.status(statusCode).json(serializeApi({ success: false, statusCode, message, data: null, meta: null, errors }));
  }
}
