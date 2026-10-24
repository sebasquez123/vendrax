import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  CALLBACK_FETCH_ERROR = 'CALLBACK_FETCH_ERROR',
  CALLBACK_ATTEMPTS_ERROR = 'CALLBACK_ATTEMPTS_ERROR',
  CALLBACK_OUTPUT_ERROR = 'CALLBACK_OUTPUT_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  SERVERCLIENT_NO_FOUND_ERROR = 'SERVERCLIENT_NO_FOUND_ERROR',
  USER_NO_FOUND_ERROR = 'USER_NO_FOUND_ERROR',
  OAUTH_NO_FOUND_ERROR = 'OAUTH_NO_FOUND_ERROR',
  MISSING_RESPONSE_MAP_ERROR = 'MISSING_RESPONSE_MAP_ERROR',
}

export class ToolAttemptsError extends DomainError {
  public readonly publicMessage = 'Gateway timeout Error';
  public readonly httpStatus = 504;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ToolOutputFormatError extends DomainError {
  public readonly publicMessage = 'Expectation Error';
  public readonly httpStatus = 417;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
export class ToolFetchError extends DomainError {
  public readonly publicMessage = 'Bad Gateway Error';
  public readonly httpStatus = 502;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ToolInternalError extends DomainError {
  public readonly publicMessage = 'Internal Server Error';
  public readonly httpStatus = 500;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
