import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  LANGCHAIN_CLIENT_CONNECTION_ERROR = 'LANGCHAIN_CLIENT_CONNECTION_ERROR',
  NO_FOUND_ACTIVE_CLIENT_ERROR = 'NO_FOUND_ACTIVE_CLIENT_ERROR',
  GENERIC_CLIENT_CONNECTION_ERROR = 'GENERIC_CLIENT_CONNECTION_ERROR',
  TOOL_CALLING_ERROR = 'TOOL_CALLING_ERROR',
  TOOL_RETRIEVAL_ERROR = 'TOOL_RETRIEVAL_ERROR',
  CLIENT_RETRIEVAL_ERROR = 'CLIENT_RETRIEVAL_ERROR',
  INVALID_MCP_PAYLOAD_ERROR = 'INVALID_MCP_PAYLOAD_ERROR',
}

export class ClientConnectionError extends DomainError {
  public readonly publicMessage = 'Internal Server Error';
  public readonly httpStatus = 500;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class NoFoundActiveClientError extends DomainError {
  public readonly publicMessage = 'No Data Found Error Error';
  public readonly httpStatus = 404;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ToolCallingError extends DomainError {
  public readonly publicMessage = 'Bad Gateway Error';
  public readonly httpStatus = 502;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class ClientRetrievalError extends DomainError {
  public readonly publicMessage = 'Service Unavailable Error';
  public readonly httpStatus = 503;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class InvalidMcpPayloadError extends DomainError {
  public readonly publicMessage = 'Bad Request Error';
  public readonly httpStatus = 400;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
