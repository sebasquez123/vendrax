import type { LoggerService as LoggerServiceInterface } from '@nestjs/common';
import { logger } from './config';

/**
 * Mensaje legible
 * Texto, Error (mensaje y stack) u objeto: Nest también registra excepciones y objetos como mensaje.
 */
const describe = (message: unknown): { text: string; stack?: string; data?: unknown } => {
  if (typeof message === 'string') return { text: message };
  if (message instanceof Error) return { text: `${message.name}: ${message.message}`, ...(message.stack && { stack: message.stack }) };
  return { text: JSON.stringify(message) ?? String(message), data: message };
};

/**
 * Logger por contexto
 * Escala: trace (detalle) · debug (pasos; también 'log' del arranque de Nest) · info (runtime) · warn · error · fatal.
 */
export class LoggerService implements LoggerServiceInterface {
  constructor(private readonly context: string) {}

  fatal(message: unknown, detail?: object, stack?: string) {
    const described = describe(message);
    logger.fatal(
      { context: this.context, ...(detail && { detail }), ...((stack ?? described.stack) && { stack: stack ?? described.stack }) },
      described.text
    );
  }

  /** Nest la llama como (mensaje, stack | origen); el proyecto, como (mensaje, status, detail, stack, code). */
  error(message: unknown, status?: number | string, detail?: object, stack?: string, code?: string) {
    const described = describe(message);
    const fromNest = typeof status === 'string' ? status : undefined;
    const nestStack = fromNest?.includes('\n') ? fromNest : undefined;
    const trace = stack ?? described.stack ?? nestStack;
    logger.error(
      {
        context: this.context,
        ...(code && { code }),
        ...(typeof status === 'number' && { status }),
        ...(fromNest && !nestStack && { source: fromNest }),
        ...(detail && { detail }),
        ...(described.data !== undefined && { data: described.data }),
        ...(trace && { stack: trace }),
      },
      described.text
    );
  }

  warn(message: unknown, detail?: object) {
    logger.warn({ context: this.context, ...(detail && { detail }) }, describe(message).text);
  }

  info(message: string, detail?: object) {
    logger.info({ context: this.context, ...(detail && { detail }) }, message);
  }

  log(message: string, detail?: object) {
    this.debug(message, detail);
  }

  debug(message: string, detail?: object) {
    logger.debug({ context: this.context, ...(detail && { detail }) }, message);
  }

  trace(message: string, detail?: object) {
    logger.trace({ context: this.context, ...(detail && { detail }) }, message);
  }

  verbose(message: string, detail?: object) {
    this.trace(message, detail);
  }
}
