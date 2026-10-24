import { ZodSafeParseResult } from 'zod';

export const formatZodErrorMessages = <T>(issues: ZodSafeParseResult<T>): string[] => {
  const errors = issues.error?.issues as { path: PropertyKey[]; message: string }[];
  return errors.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.map((key) => String(key)).join('.') : 'payload';
    return `${path}: ${issue.message}`;
  });
};
