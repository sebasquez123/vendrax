import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  NO_AUTH_AVAILABLE_ERROR = 'NO_AUTH_AVAILABLE_ERROR',
  LOAD_ERROR = 'LOAD_ERROR',
  PAYLOAD_ERROR = 'PAYLOAD_ERROR',
  SERVER_NO_FOUND_ERROR = 'SERVER_NO_FOUND_ERROR',
  REFRESH_PAYLOAD_ERROR = 'REFRESH_PAYLOAD_ERROR',
  TOKEN_PAYLOAD_ERROR = 'TOKEN_PAYLOAD_ERROR',
  USER_CREATION_PAYLOAD_ERROR = 'USER_CREATION_PAYLOAD_ERROR',
  TOKEN_REFRESH_ERROR = 'TOKEN_REFRESH_ERROR',
  ACCESS_TOKEN_ERROR = 'ACCESS_TOKEN_ERROR',
  USER_NO_FOUND_ERROR = 'USER_NO_FOUND_ERROR',
  SERVERCLIENT_NO_FOUND_ERROR = 'SERVERCLIENT_NO_FOUND_ERROR',
  VERIFY_CODE_ERROR = 'VERIFY_CODE_ERROR',
  GET_USER_PROFILE_ERROR = 'GET_USER_PROFILE_ERROR',
  PLENTY_REFRESH_TRIES_ERROR = 'PLENTY_REFRESH_TRIES_ERROR',
  CSRF_TOKEN_ERROR = 'CSRF_TOKEN_ERROR',
}

export class AuthInternalError extends DomainError {
  public readonly publicMessage = 'Internal Server Error';
  public readonly httpStatus = 500;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class AuthPayloadError extends DomainError {
  public readonly publicMessage = 'Bad Request Error';
  public readonly httpStatus = 400;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class AuthNoFoundError extends DomainError {
  public readonly publicMessage = 'No Data Found Error';
  public readonly httpStatus = 404;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class AuthAdapterBadGatewayError extends DomainError {
  public readonly publicMessage = 'Bad Gateway Error';
  public readonly httpStatus = 502;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class AuthAdapterDataNoFoundError extends DomainError {
  public readonly publicMessage = 'Precondition Failed Error';
  public readonly httpStatus = 412;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class AuthGatewayTimeoutError extends DomainError {
  public readonly publicMessage = 'Gateway Timeout Error';
  public readonly httpStatus = 504;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
