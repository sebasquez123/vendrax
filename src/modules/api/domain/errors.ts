import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  SESSION_EXPIRED_ERROR = 'SESSION_EXPIRED_ERROR',
  NOT_OWNER_ERROR = 'NOT_OWNER_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CSRF_REJECTED_ERROR = 'CSRF_REJECTED_ERROR',
  REJECTED_ERROR = 'REJECTED_ERROR',
  UNAVAILABLE_ERROR = 'UNAVAILABLE_ERROR',
  RESPONSE_FORMAT_ERROR = 'RESPONSE_FORMAT_ERROR',
  UNSAVED_LAYOUT_ERROR = 'UNSAVED_LAYOUT_ERROR',
}

export class ApiBadRequestError extends DomainError {
  public readonly publicMessage = 'Bad Request Error';
  public readonly httpStatus = 400;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ApiUnauthorizedError extends DomainError {
  public readonly publicMessage = 'Unauthorized Error';
  public readonly httpStatus = 401;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ApiForbiddenError extends DomainError {
  public readonly publicMessage = 'Forbidden Error';
  public readonly httpStatus = 403;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ApiNotFoundError extends DomainError {
  public readonly publicMessage = 'No Data Found Error';
  public readonly httpStatus = 404;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ApiPreconditionFailedError extends DomainError {
  public readonly publicMessage = 'Precondition Failed Error';
  public readonly httpStatus = 412;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ApiUnprocessableEntityError extends DomainError {
  public readonly publicMessage = 'Unprocessable Entity Error';
  public readonly httpStatus = 422;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ApiBadGatewayError extends DomainError {
  public readonly publicMessage = 'Bad Gateway Error';
  public readonly httpStatus = 502;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ApiGatewayTimeoutError extends DomainError {
  public readonly publicMessage = 'Gateway Timeout Error';
  public readonly httpStatus = 504;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
