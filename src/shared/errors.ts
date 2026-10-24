import { DomainError } from '~/shared/filters/http-exception.filter';

export enum DomainErrorCodes {
  NOT_ENCRYPTED_VALUE_ERROR = 'NOT_ENCRYPTED_VALUE_ERROR',
  DECRYPTION_FAILED_ERROR = 'DECRYPTION_FAILED_ERROR',
}

export class NotEncryptedValueError extends DomainError {
  public readonly publicMessage = 'Precondition Failed Error';
  public readonly httpStatus = 412;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}

export class DecryptionFailedError extends DomainError {
  public readonly publicMessage = 'Internal Server Error';
  public readonly httpStatus = 500;
  constructor(message: string, code: DomainErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
