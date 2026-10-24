import { getHttpContext } from '~/shared/context/global_context';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { HttpContext } from '~/shared/context/types/context.types';

export const getBotIdentityFromContext = createParamDecorator((_data: unknown, _context: ExecutionContext) => {
  const storage = getHttpContext();
  return storage as HttpContext;
});
