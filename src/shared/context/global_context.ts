import { AsyncLocalStorage } from 'node:async_hooks';

import type { Request } from 'express';
import type { SocketContext, HttpContext } from './types/context.types';
import { randomBytes } from 'node:crypto';
const asyncLocalStorage = new AsyncLocalStorage<HttpContext>();
const socketAsyncLocalStorage = new AsyncLocalStorage<SocketContext>();

export const initialContext = (): Pick<SocketContext, 'connection' | 'user' | 'client' | 'i18n'> => ({
  connection: null,
  user: {
    userEmail: null,
    userId: null,
    userName: null,
    birthDate: null,
    utc: null,
    language: null,
  },
  client: {
    appClientId: null,
    botName: null,
    scopes: null,
  },
  i18n: null,
});

export const initialization = (socketId: string): SocketContext => {
  return {
    socket: socketId,
    traceId: generateRandomString(32),
    ...initialContext(),
  };
};
export function setHttpContext(request: Request): HttpContext {
  const context: HttpContext = {
    traceId: request.header('X-Cloud-Trace-Context')?.split('/')[0] ?? generateRandomString(32),
    startTime: process.hrtime(),
    httpRequest: {
      remoteIp: request.header('x-forwarded-for') ?? request.socket.remoteAddress ?? '',
      referer: request.header('referer'),
      domain: request.hostname,
      headers: request.headers as Record<string, string | string[] | undefined>,
    },
  };
  asyncLocalStorage.enterWith(context);
  return context;
}

export function setSocketContext(ctxt: SocketContext): SocketContext {
  socketAsyncLocalStorage.enterWith(ctxt);
  return ctxt;
}

export function getHttpContext(): HttpContext | undefined {
  return asyncLocalStorage.getStore();
}

export function getSocketContext(): SocketContext | undefined {
  return socketAsyncLocalStorage.getStore();
}

export function getDurationTilNow(): number {
  const diff = process.hrtime(getHttpContext()?.startTime);
  return +(diff[0] + diff[1] * 1e-9).toFixed(6);
}

export function generateRandomString(length: number): string {
  const bytes = randomBytes(Math.ceil(length / 2));
  return bytes.toString('hex').slice(0, length);
}
