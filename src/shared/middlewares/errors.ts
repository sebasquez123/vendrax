import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  UNACCEPTABLE_HEADERS_ERROR = 'UNACCEPTABLE_HEADERS_ERROR',
  NO_SERVER_PERMISSIONS_FOUND_ERROR = 'NO_SERVER_PERMISSIONS_FOUND_ERROR',
  NO_SCOPES_PROVIDED_ERROR = 'NO_SCOPES_PROVIDED_ERROR',
  NO_AUTHORIZED_SCOPES_ERROR = 'NO_AUTHORIZED_SCOPES_ERROR',
  NO_AVAILABLE_SERVER_ERROR = 'NO_AVAILABLE_SERVER_ERROR',
  NO_AVAILABLE_TOOLS_ERROR = 'NO_AVAILABLE_TOOLS_ERROR',
  NO_CONFIGURED_SERVER_ERROR = 'NO_CONFIGURED_SERVER_ERROR',
  UNACEPTABLE_VALIDATION_PAYLOAD_ERROR = 'UNACEPTABLE_VALIDATION_PAYLOAD_ERROR',
  USER_NO_ACTIVE_OR_LOCKED_ERROR = 'USER_NO_ACTIVE_OR_LOCKED_ERROR',
  PAYLOAD_FRAUD_ERROR = 'PAYLOAD_FRAUD_ERROR',
  NO_USER_SERVER_PERMISSIONS_ERROR = 'NO_USER_SERVER_PERMISSIONS_ERROR',
  NO_USER_TOOL_PERMISSIONS_ERROR = 'NO_USER_TOOLS_PERMISSIONS_ERROR',
  NO_CONTEXT_FOUND_ERROR = 'NO_CONTEXT_FOUND_ERROR',
  NO_SOURCE_API_FOUND_ERROR = 'NO_SOURCE_API_FOUND_ERROR',
  NO_KNOWLEDGE_DOMAIN_ERROR = 'NO_KNOWLEDGE_DOMAIN_ERROR',
  INCONSISTENT_KNOWLEDGE_REQUEST_ERROR = 'INCONSISTENT_KNOWLEDGE_REQUEST_ERROR',
  NO_AUTHORIZED_SUBDOMAIN_ERROR = 'NO_AUTHORIZED_SUBDOMAIN_ERROR',
  NO_AUTHORIZED_MODE_ERROR = 'NO_AUTHORIZED_MODE_ERROR',
  NO_API_KEY_ERROR = 'NO_API_KEY_ERROR',
  INVALID_API_KEY_ERROR = 'INVALID_API_KEY_ERROR',
}

export class MiddlewarePayloadError extends DomainError {
  public readonly publicMessage = 'Bad Request Error';
  public readonly httpStatus = 400;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class MiddlewareNoApiFoundError extends DomainError {
  public readonly publicMessage = 'No Data Found';
  public readonly httpStatus = 404;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class MiddlewareNoFoundError extends DomainError {
  public readonly publicMessage = 'No Data Found Error';
  public readonly httpStatus = 404;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class MiddlewareUnauthorizedError extends DomainError {
  public readonly publicMessage = 'Unauthorized Error';
  public readonly httpStatus = 401;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class MiddlewareUnavailableServerError extends DomainError {
  public readonly publicMessage = 'Service Unavailable Error';
  public readonly httpStatus = 503;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class MiddlewareInternalServerError extends DomainError {
  public readonly publicMessage = 'Internal Server Error';
  public readonly httpStatus = 500;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class MiddlewareUserNoActiveError extends DomainError {
  public readonly publicMessage = 'Locked Error';
  public readonly httpStatus = 423;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
