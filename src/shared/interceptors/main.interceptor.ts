import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';

import { LoggerService } from '~/shared/logging/main.logger';
import { getHttpContext, setHttpContext } from '~/shared/context/global_context';

interface reqParams {
  method: string;
  url: string;
  route: string;
  remoteIp: string;
  domain?: string;
}
const requestErrorLogTemplate = (reqParams: reqParams, duration: number, error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return `Request error From: \nIP: ${reqParams.remoteIp}\nDomain:${reqParams.domain ?? 'Unknown'}\nMethod: ${reqParams.method}\nURL: ${reqParams.url}\nRoute: ${reqParams.route}\nLapse duration: ${duration} seconds\nError details: ${message}`;
};
export class LoggingInterceptor implements NestInterceptor {
  logger = new LoggerService(LoggingInterceptor.name);
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const parameters: reqParams = {
      method: '',
      url: '',
      route: '',
      remoteIp: '',
      domain: '',
    };

    const request = context.switchToHttp().getRequest<Request>();

    let localStorageContext = getHttpContext();
    const response = context.switchToHttp().getResponse<Response>();

    if (!localStorageContext) {
      localStorageContext = setHttpContext(request);
      response.set('X-Request-Id', localStorageContext.traceId);
    }

    const handler = context.getHandler();
    const controller = context.getClass();

    const route = `${controller.name}.${handler.name}`;
    localStorageContext.route = route;

    parameters.method = request.method;
    parameters.url = request.url;
    parameters.route = route;
    parameters.remoteIp = localStorageContext.httpRequest.remoteIp;
    parameters.domain = localStorageContext.httpRequest.domain;

    const duration = new Date().getTime();

    return next.handle().pipe(
      tap(() => {}),
      timeout(30000),
      catchError((error: unknown) => {
        const difference = (new Date().getTime() - duration) / 1000;
        this.logger.error(requestErrorLogTemplate(parameters, difference, error));
        return throwError(() => error);
      })
    );
  }
}
