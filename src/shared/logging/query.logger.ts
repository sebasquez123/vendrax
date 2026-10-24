import type { Logger, QueryRunner } from 'typeorm';

import config from '~/config';
import { LoggerService } from './main.logger';

/**
 * Resumen de una query
 * Su operación y la primera tabla que toca, en una línea corta y sin parámetros.
 */
const shortQuery = (query: string): string => {
  const operation = query.trim().split(/\s+/)[0]?.toUpperCase() ?? 'QUERY';
  const table = /\b(?:FROM|INTO|UPDATE|JOIN)\s+("?[\w]+"?(?:\."?[\w]+"?)?)/i.exec(query)?.[1]?.replace(/"/g, '');
  return table ? `${operation} ${table}` : operation;
};

/**
 * Logger de TypeORM
 * Queries en 'trace' (completas en desarrollo, resumidas en producción); lentas en 'warn' y fallidas en 'error'.
 */
export class QueryLogger implements Logger {
  private readonly logger = new LoggerService(QueryLogger.name);

  logQuery(query: string, parameters?: unknown[], _queryRunner?: QueryRunner): void {
    if (config.log.isProduction) return this.logger.trace(shortQuery(query));
    this.logger.trace(query, parameters?.length ? { parameters } : undefined);
  }

  logQueryError(error: string | Error, query: string, parameters?: unknown[], _queryRunner?: QueryRunner): void {
    const detail = config.log.isProduction ? { error: String(error) } : { error: String(error), query, parameters };
    this.logger.error(`Query failed: ${shortQuery(query)}`, 500, detail);
  }

  logQuerySlow(time: number, query: string, _parameters?: unknown[], _queryRunner?: QueryRunner): void {
    this.logger.warn(`Slow query (${time}ms): ${shortQuery(query)}`);
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner): void {
    this.logger.trace(message);
  }

  logMigration(message: string, _queryRunner?: QueryRunner): void {
    this.logger.info(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown, _queryRunner?: QueryRunner): void {
    if (level === 'warn') this.logger.warn(String(message));
    else this.logger.debug(String(message));
  }
}
