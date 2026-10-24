import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  SERVERS_NO_AVAILABLE_ERROR = 'SERVERS_NO_AVAILABLE_ERROR',
  PROVIDERS_NO_AVAILABLE_ERROR = 'PROVIDERS_NO_AVAILABLE_ERROR',
  INVALID_CHAT_PAYLOAD_ERROR = 'INVALID_CHAT_PAYLOAD_ERROR',
  INVALID_IFRAME_PAYLOAD_ERROR = 'INVALID_IFRAME_PAYLOAD_ERROR',
  NO_USER_IDENTIFICATION_ERROR = 'NO_USER_IDENTIFICATION_ERROR',
  INTERNAL_CONTEXT_ERROR = 'INTERNAL_CONTEXT_ERROR',
  INVALID_ASSET_TOKEN_ERROR = 'INVALID_ASSET_TOKEN_ERROR',
  ASSET_NOT_FOUND_ERROR = 'ASSET_NOT_FOUND_ERROR',
}

export class ServersNoAvailableError extends DomainError {
  public readonly publicMessage = 'No Data Found Error';
  public readonly httpStatus = 404;
  constructor(message: string, code: string, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class InvalidChatPayloadError extends DomainError {
  public readonly publicMessage = 'Bad Request Error';
  public readonly httpStatus = 400;
  constructor(message: string, code: string, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class InvalidAssetTokenError extends DomainError {
  public readonly publicMessage = 'Forbidden Error';
  public readonly httpStatus = 403;
  constructor(message: string, code: string, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class AssetNotFoundError extends DomainError {
  public readonly publicMessage = 'No Data Found Error';
  public readonly httpStatus = 404;
  constructor(message: string, code: string, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class InternalServerError extends DomainError {
  public readonly publicMessage = 'Internal Server Error';
  public readonly httpStatus = 500;
  constructor(message: string, code: string, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
