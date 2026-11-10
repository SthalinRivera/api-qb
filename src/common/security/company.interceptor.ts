import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { requestContext } from './request-context';

@Injectable()
export class CompanyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const actor = context.switchToHttp().getRequest().actor;
    if (!actor) return next.handle();
    return new Observable((subscriber) => {
      const subscription = requestContext.run(actor, () => next.handle().subscribe(subscriber));
      return () => subscription.unsubscribe();
    });
  }
}
