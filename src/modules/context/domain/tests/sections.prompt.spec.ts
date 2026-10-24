import { describe, expect, it } from '@jest/globals';
import type { KnowledgeBase, VocabularyEntry } from '~/knowledge/types';
import { definePack } from '~/knowledge/define_pack';
import { findKnowledgeDomain, KNOWLEDGE_DOMAINS } from '~/knowledge';
import { VOCABULARY } from '~/knowledge/SUPERSET/general/03_vocabulary/03_vocabulary';
import { checkPack, checkPacks, checkVocabulary, renderKnowledgeIndex, renderSection, renderVocabulary } from '../sections.prompt';

const count = { kind: 'metric', name: 'Total ventas', source: 'MOVES', meaning: 'cantidad de ventas' };
const money = { kind: 'metric', name: 'Total recaudo por ventas', source: 'MOVES', meaning: 'dinero de ventas' };

describe('renderSection', () => {
  it('heads a server part with the convention heading and skips empty blocks', () => {
    expect(renderSection('Gestor de paneles', 'knowledge', ['## A', '', null, '## B'])).toBe('# Gestor de paneles · knowledge\n## A\n\n## B');
  });

  it('renders nothing for a part without content', () => {
    expect(renderSection('PAY', 'data', [null, '  '])).toBe('');
  });
});

describe('renderVocabulary', () => {
  it('states a single meaning as the answer and several as a question to ask', () => {
    const text = renderVocabulary([
      { terms: ['ventas', 'total de ventas'], refersTo: [count, money] },
      { terms: ['cantidad de ventas'], refersTo: [count] },
    ]);
    expect(text).toContain(
      '"ventas" / "total de ventas" → ambiguous, ask which one: metric Total ventas (MOVES): cantidad de ventas; or metric Total recaudo por ventas'
    );
    expect(text).toContain('"cantidad de ventas" → metric Total ventas (MOVES): cantidad de ventas.');
  });

  it('renders nothing without entries', () => {
    expect(renderVocabulary([])).toBe('');
    expect(renderVocabulary(undefined)).toBe('');
  });

  it('resolves the dashboard vocabulary for the term that made the agent loop', () => {
    expect(renderVocabulary(VOCABULARY)).toMatch(/"total de ventas".*ambiguous, ask which one/);
  });
});

describe('renderKnowledgeIndex', () => {
  const knowledgeBase: KnowledgeBase = {
    namespace: 'SUPERSET',
    searchTool: 'Panels__search_knowledge',
    topics: [
      { title: 'Metodología', covers: 'what can be built', documentLocation: 'docs/SUPERSET/SUPERSET_METHODOLOGY.md', status: 'available' },
      { title: 'Métricas', covers: 'what each metric computes', documentLocation: 'por escribir', status: 'planned' },
    ],
  };

  it("names the server's own search tool and announces only documents already ingested", () => {
    const text = renderKnowledgeIndex(knowledgeBase);
    expect(text).toContain("'Panels__search_knowledge' searches only these documents");
    expect(text).toContain('- Metodología: what can be built.');
    expect(text).not.toContain('Métricas');
  });

  it('renders nothing when no document is available yet', () => {
    expect(renderKnowledgeIndex({ ...knowledgeBase, topics: [knowledgeBase.topics[1]!] })).toBe('');
    expect(renderKnowledgeIndex(undefined)).toBe('');
  });
});

describe('checkVocabulary', () => {
  const entries: VocabularyEntry[] = [{ terms: ['ventas'], refersTo: [count, money] }];

  it('reports a target whose source was read but no longer has that name', () => {
    const check = checkVocabulary(entries, { namesBySource: new Map([['MOVES', { metric: ['Total ventas'] }]]), visibleSources: ['MOVES'] });
    expect(check).toEqual({ drifted: [{ terms: ['ventas'], target: money }], unseenSources: [] });
  });

  it('tells a source this user cannot see apart from a rename', () => {
    const check = checkVocabulary(entries, { namesBySource: new Map(), visibleSources: ['HISTORY'] });
    expect(check).toEqual({ drifted: [], unseenSources: ['MOVES'] });
  });

  it('checks nothing it could not read: a visible source without details, or a partial listing', () => {
    expect(checkVocabulary(entries, { namesBySource: new Map(), visibleSources: ['MOVES'] })).toEqual({ drifted: [], unseenSources: [] });
    expect(checkVocabulary(entries, { namesBySource: new Map(), visibleSources: [], listedSources: ['OTHER'] })).toEqual({
      drifted: [],
      unseenSources: [],
    });
    expect(checkVocabulary(entries, { namesBySource: new Map() })).toEqual({ drifted: [], unseenSources: [] });
  });
});

describe('checkPack', () => {
  const minimal = definePack({ server: { serverName: 'pay_api', domain: 'pay', label: 'PAY', toolPrefix: '' }, playbook: '' });

  it('reports a pack whose required playbook is still empty', () => {
    expect(checkPack(minimal)).toEqual([expect.stringContaining('01_playbook is empty')]);
  });

  it('reports inconsistent optional parts', () => {
    const issues = checkPack(
      definePack({
        server: minimal.server,
        playbook: '## Scope',
        vocabulary: [{ terms: [], refersTo: [] }],
        knowledgeBase: { namespace: '', searchTool: '', topics: [] },
      })
    );
    expect(issues).toEqual([expect.stringContaining('03_vocabulary entry 0'), expect.stringContaining('05_knowledge_base')]);
  });

  it('accepts every pack of the tree as complete', () => {
    for (const pack of KNOWLEDGE_DOMAINS.flatMap((domain) => domain.packs))
      expect({ pack: pack.id, issues: checkPack(pack) }).toEqual({ pack: pack.id, issues: [] });
    expect(findKnowledgeDomain('superset_mcp')!.packs.map((pack) => pack.id)).toEqual(['superset/general/advance', 'superset/general/guided']);
  });

  it('registers one domain per server, and no two domains share a namespace or a search tool', () => {
    const names = KNOWLEDGE_DOMAINS.map((domain) => domain.server.serverName);
    expect(new Set(names).size).toBe(names.length);
    expect(checkPacks(KNOWLEDGE_DOMAINS.flatMap((domain) => domain.packs))).toEqual([]);
  });

  it('reports two packs that would confuse their knowledge bases', () => {
    const knowledgeBase = { namespace: 'SAME', searchTool: 'same_search', topics: [] };
    const first = definePack({ server: { serverName: 'pay_api', domain: 'pay', label: 'PAY', toolPrefix: '' }, playbook: 'x', knowledgeBase });
    const second = definePack({ server: { serverName: 'pms_api', domain: 'pms', label: 'PMS', toolPrefix: '' }, playbook: 'x', knowledgeBase });
    expect(checkPacks([first, second])).toHaveLength(2);
    expect(checkPacks([first, { ...first, id: 'pay/other' }])).toEqual([]);
  });
});
