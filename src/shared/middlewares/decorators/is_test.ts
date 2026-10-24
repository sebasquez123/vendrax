import { SetMetadata } from '@nestjs/common';

export const isTestSymbol = Symbol('isTest');

export function Test() {
  return SetMetadata(isTestSymbol, true);
}
