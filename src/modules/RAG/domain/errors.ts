import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  RAG_FETCH_ERROR = 'RAG_FETCH_ERROR',
  RAG_OUTPUT_ERROR = 'RAG_OUTPUT_ERROR',
}

export class RagFetchError extends DomainError {
  public readonly publicMessage = 'Bad Gateway Error';
  public readonly httpStatus = 502;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class RagOutputFormatError extends DomainError {
  public readonly publicMessage = 'Expectation Error';
  public readonly httpStatus = 417;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
