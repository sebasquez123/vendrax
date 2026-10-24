import { DomainError } from '~/shared/filters/http-exception.filter';

export enum RouterErrorCodes {
  ROUTER_CLASSIFICATION_FAILED = 'ROUTER_CLASSIFICATION_FAILED',
  ROUTER_DECISION_INVALID = 'ROUTER_DECISION_INVALID',
}

export class RouterClassificationError extends DomainError {
  public readonly publicMessage = 'Routing failed';
  public readonly httpStatus = 502;
  constructor(message: string, code: RouterErrorCodes, detail?: Record<string, unknown>) {
    super(message, code, detail);
  }
}
