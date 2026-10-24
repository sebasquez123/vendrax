import { describe, expect, it } from '@jest/globals';
import { SERVER_CATALOG } from '~/migrations/seeds/02_permissions_seed';
import { KNOWLEDGE_SEARCH_PERMISSION } from '../infrastructure/tools/rag/tool';
import { ToolOrchestratorService } from './tools_orchestrator.service';

describe('ToolOrchestratorService.getSystemToolNames', () => {
  const service = new ToolOrchestratorService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never);

  it('knows every tool the permissions catalog grants, so a connection is not refused (NO_AVAILABLE_TOOLS_ERROR)', () => {
    const names = service.getSystemToolNames();
    const listed = Object.values(SERVER_CATALOG).flatMap((catalog) => catalog.tools.map((tool) => tool.name));
    expect(listed.filter((name) => !names.has(name))).toEqual([]);
  });

  it('accepts the knowledge search permission, which no server registers as a tool of its own', () => {
    expect(service.getFlattenedTools().some((tool) => tool.name === KNOWLEDGE_SEARCH_PERMISSION)).toBe(false);
    expect(service.getSystemToolNames().has(KNOWLEDGE_SEARCH_PERMISSION)).toBe(true);
  });
});
