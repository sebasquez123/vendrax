import type { PrettyOptions } from 'pino-pretty';

export interface FileTransportOptions {
  file: string;
  extension: string;
  size: string;
  limit: number;
  pretty: PrettyOptions;
}
