import path from 'node:path';
import type { BaseLogger, Level, LoggerOptions, TransportTargetOptions } from 'pino';
import Pino, { stdSerializers } from 'pino';

import config from '~/config';
import { getHttpContext } from '~/shared/context/global_context';
import type { FileTransportOptions } from './types/logging.types';

/**
 * Destinos de los logs
 * Texto plano de una línea por evento: la terminal siempre y, con 'LOG_FILE', un archivo rotado por tamaño.
 */
const plainText = (colorize: boolean) => ({
  colorize,
  levelFirst: true,
  singleLine: true,
  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
  messageFormat: '[{context}] {msg}',
  ignore: 'pid,hostname,context,timestamp,serviceContext',
});

const fileTarget = (file: string): TransportTargetOptions => {
  const extension = path.extname(file);
  const options: FileTransportOptions = {
    file: extension ? file.slice(0, -extension.length) : file,
    extension,
    size: config.log.fileSize,
    limit: config.log.fileLimit,
    pretty: plainText(false),
  };
  return { target: path.join(__dirname, `file.transport${path.extname(__filename)}`), level: config.log.level, options };
};

const targets: TransportTargetOptions[] = [
  { target: 'pino-pretty', level: config.log.level, options: { ...plainText(config.log.colorize), destination: 1 } },
  ...(config.log.file ? [fileTarget(config.log.file)] : []),
];

const options: LoggerOptions = {
  level: config.log.level,
  transport: { targets },
  serializers: {
    err: stdSerializers.errWithCause,
    error: stdSerializers.errWithCause,
    exception: stdSerializers.errWithCause,
  },
  mixin: () => {
    const requestContext = getHttpContext();
    return {
      route: requestContext?.route,
      timestamp: requestContext?.startTime,
    };
  },
};

const instance = Pino(options);

export const logger: Pick<BaseLogger, Level> = {
  trace: instance.trace.bind(instance),
  debug: instance.debug.bind(instance),
  info: instance.info.bind(instance),
  warn: instance.warn.bind(instance),
  error: instance.error.bind(instance),
  fatal: instance.fatal.bind(instance),
};
