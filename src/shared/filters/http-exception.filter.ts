import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';
import type { Response } from 'express';
import { LoggerService } from '../logging/main.logger';

export const isDomainError = (error: unknown): error is DomainError => {
  return error instanceof DomainError;
};
export const isHttpError = (error: unknown): error is HttpException => error instanceof HttpException;
export const isError = (error: unknown): error is Error => error instanceof Error;

export const filterDomainError = (error: unknown): { msg: string; status: any; detail: any; code?: any } => {
  if (isDomainError(error)) {
    return { msg: `[Domain error]: ${error.message}`, status: error.httpStatus, detail: error.detail, code: error.code };
  } else if (isHttpError(error)) {
    return { msg: `[HTTP error]: ${error.message}`, status: error.getStatus(), detail: {} };
  } else if (isError(error)) {
    return { msg: `[Error]: ${error.message}`, status: 500, detail: {} };
  } else {
    return { msg: `[Unknown error]: ${String(error)}`, status: 500, detail: {} };
  }
};
export abstract class DomainError extends Error {
  abstract readonly httpStatus: number;
  abstract readonly publicMessage: string;
  public readonly code: string;
  constructor(
    message: string,
    code: string,
    public readonly detail?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private logger = new LoggerService(HttpExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const context = host.getType();
    if (context === 'http') return this.catchHttp(exception, host.switchToHttp());
    if (context === 'ws') return this.catchWs(exception);
    throw new Error(`Unknown context type: ${context}`);
  }

  private catchHttp(error: Error, context: HttpArgumentsHost) {
    const response = context.getResponse<Response>();
    if (isDomainError(error)) {
      this.logger.error(`[Domain error]: ${error.message}`, error.httpStatus, error.detail, error.code);
      return response.status(error.httpStatus).json({
        code: error.code,
        message: error.publicMessage,
      });
    } else if (isHttpError(error)) {
      this.logger.error(`Unexpected error: ${error.message}`, error.getStatus(), undefined, error.stack);
      return response.status(error.getStatus()).json(error.getResponse());
    }

    const err = isError(error) ? error : new Error('Unknown internal error');

    this.logger.error(`Uncaught error: ${err.message}`);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: err.message || 'Internal server error',
    });
  }

  private catchWs(error: Error): void {
    if (isDomainError(error)) {
      this.logger.error(`[Domain error]: ${error.message}`, error.httpStatus, error.detail, error.code);
      return;
    }
    this.logger.error(`[WS error]: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}
