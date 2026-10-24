import build from 'pino-pretty';
import roll from 'pino-roll';

import type { FileTransportOptions } from './types/logging.types';

/**
 * Transport del archivo de logs
 * Texto plano sin color, rotado por tamaño con 'pino-roll': conserva solo los últimos 'limit' archivos.
 */
export default async ({ file, extension, size, limit, pretty }: FileTransportOptions) =>
  build({
    ...pretty,
    colorize: false,
    destination: await roll({ file, extension, size, limit: { count: Math.max(limit - 1, 0) }, mkdir: true }),
  });
