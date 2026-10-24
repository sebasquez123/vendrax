import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  NO_CLIENT_SERVER_FOUND_ERROR = 'NO_CLIENT_SERVER_FOUND_ERROR',
  NO_OAUTH_FOUND_ERROR = 'NO_OAUTH_FOUND_ERROR',
  NO_USER_FOUND_ERROR = 'NO_USER_FOUND_ERROR',
  NO_SERVER_FOUND_ERROR = 'NO_SERVER_FOUND_ERROR',
  NO_CLIENT_FOUND_ERROR = 'NO_CLIENT_FOUND_ERROR',
  INVALID_FEEDBACK_PAYLOAD_ERROR = 'INVALID_FEEDBACK_PAYLOAD_ERROR',
  NO_GUIDE_FOUND_ERROR = 'NO_GUIDE_FOUND_ERROR',
  DATABASE_UNAVAILABLE_ERROR = 'DATABASE_UNAVAILABLE_ERROR',
}

export class InvalidAdminPayloadError extends DomainError {
  public readonly publicMessage = 'Bad Request Error';
  public readonly httpStatus = 400;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class NoRecordsfoundError extends DomainError {
  public readonly publicMessage = 'No Data Found Error';
  public readonly httpStatus = 404;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class DatabaseUnavailableError extends DomainError {
  public readonly publicMessage = 'Service Unavailable Error';
  public readonly httpStatus = 503;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
