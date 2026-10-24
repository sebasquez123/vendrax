import { SocketContext } from '~/shared/context/types/context.types';

export interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export type ICachedContext = SocketContext;
