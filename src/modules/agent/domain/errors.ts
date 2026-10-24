import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  NO_ADAPTER_FOUND_ERROR = 'NO_ADAPTER_FOUND_ERROR',
  ADAPTER_LOADING_ERROR = 'ADAPTER_LOADING_ERROR',
}

export class AgentNoFoundError extends DomainError {
  public readonly publicMessage = 'No Data Found Error';
  public readonly httpStatus = 404;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class AgentLoadError extends DomainError {
  public readonly publicMessage = 'Internal Server Error';
  public readonly httpStatus = 500;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
