import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logging/main.logger';
import { DomainErrorCodes as e, RagFetchError, RagOutputFormatError } from '../domain/errors';
import { DomainError } from '~/shared/filters/http-exception.filter';
import { RagServiceParams } from '~/modules/tools/domain/interfaces/tool.interfaces';
import config from '~/config';

const SEARCH_SETTINGS = { top_k: config.rag.top_k, min_score: config.rag.min_score, mode: config.rag.mode, order_by: config.rag.order_by } as const;
const REQUEST_TIMEOUT_MS = config.rag.ragTimeoutMs;

@Injectable()
export class RagService {
  private logger = new LoggerService(RagService.name);

  public query = async ({ query, namespace, toolResponseConfig }: RagServiceParams): Promise<unknown> => {
    if (!config.rag.token) return 'Error: the knowledge base is not configured in this environment, so it cannot be searched.';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const { default: fetch } = await import('node-fetch');
      this.logger.trace('Searching knowledge base', { query, namespace });

      const response = await fetch(config.rag.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.rag.token}` },
        body: JSON.stringify({ query, namespace, ...SEARCH_SETTINGS }),
        signal: controller.signal,
      });
      const body = await response.text();
      if (!response.ok) throw new RagFetchError(`Knowledge base search failed: ${body}`, e.RAG_FETCH_ERROR, { status: response.status });

      const result = toolResponseConfig.schema.safeParse(JSON.parse(body));
      if (!result.success) throw new RagOutputFormatError(`Knowledge base response invalid: ${result.error.message}`, e.RAG_OUTPUT_ERROR);

      return toolResponseConfig.mapResponse ? await toolResponseConfig.mapResponse(result.data) : result.data;
    } catch (_error: unknown) {
      if (_error instanceof DomainError) {
        this.logger.error(_error.message, _error.httpStatus ?? 500, _error.detail, _error.stack, _error.code);
        return 'Error: the knowledge base could not be searched right now. Say so plainly and answer only from what other tools return.';
      }
      const error = _error instanceof Error ? _error : new Error('Unknown error searching the knowledge base');
      this.logger.error(error.name === 'AbortError' ? 'Knowledge base search timed out' : error.message, 500);
      return 'Error: the knowledge base did not respond. Say so plainly and answer only from what other tools return.';
    } finally {
      clearTimeout(timeout);
    }
  };
}
