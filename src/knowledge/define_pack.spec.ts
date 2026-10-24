import { describe, expect, it } from '@jest/globals';
import { findKnowledgeDomain } from '.';
import { defineDomainWithModes, defineDomainWithSubdomains, definePack } from './define_pack';
import { PLAYBOOK as PAY_SHARED } from './PAY/01_playbook/01_playbook';
import { PLAYBOOK as PERSONAS } from './PAY/personas/01_playbook/01_playbook';
import { PLAYBOOK as VENTAS } from './PAY/ventas/01_playbook/01_playbook';
import { SELLER_MANUAL } from './PAY/05_knowledge_base/05_knowledge_base';
import { ADVANCE } from './SUPERSET/general/advance';
import { GUIDED } from './SUPERSET/general/guided';
import { renderKnowledgeIndex } from '~/modules/context/domain/sections.prompt';

describe('knowledge domains', () => {
  it('serves the dashboard manager from its only subdomain, in the selected mode', () => {
    const superset = findKnowledgeDomain('superset_mcp')!;
    expect(superset.modesBySubdomain).toEqual({ general: ['advance', 'guided'] });
    const advance = superset.packFor(['general'], 'advance');
    expect(advance.id).toBe('superset/general/advance');
    expect({ ...advance, id: ADVANCE.id }).toEqual(ADVANCE);
    expect(superset.packFor(['general'], 'guided').id).toBe('superset/general/guided');
    expect(() => superset.packFor(['general'], 'analytics')).toThrow();
  });

  it("builds every mode of 'general' on the same shared components, each with its own playbook and reply shapes", () => {
    const superset = findKnowledgeDomain('superset_mcp')!;
    const [advance, guided] = [superset.packFor(['general'], 'advance'), superset.packFor(['general'], 'guided')];
    for (const part of ['vocabulary', 'knowledgeBase', 'catalog', 'toolCallLimits', 'stateKey', 'includedTools'] as const)
      expect(guided[part]).toBe(advance[part]);
    expect(guided.playbook).not.toBe(advance.playbook);
    expect(guided.replyShapes).not.toBe(advance.replyShapes);
    expect([advance.mode?.label, guided.mode?.label]).toEqual(['Avanzado', 'Guiado']);
    expect(GUIDED.includedTools).toBeUndefined();
  });

  it('refuses a mode the client could not be shown (no label and description)', () => {
    const server = { serverName: 'pms_api' as const, domain: 'pms', label: 'PMS', toolPrefix: '' };
    const unnamed = definePack({ server, playbook: 'x' });
    expect(() => defineDomainWithModes({ server, subdomains: { proyectos: { quick: unnamed } } })).toThrow(/pms\/proyectos\/quick/);
  });

  it('composes PAY from its shared knowledge and the active subdomains, with their tools and documents', () => {
    const pay = findKnowledgeDomain('pay_api')!;
    expect(pay.modesBySubdomain).toEqual({ personas: [], ventas: [] });

    const personas = pay.packFor(['personas']);
    expect(personas.id).toBe('pay/personas');
    expect(personas.playbook).toBe(`${PAY_SHARED}\n${PERSONAS}`);
    expect(personas.includedTools).toEqual(['get_persons']);
    expect(personas.knowledgeBase?.topics).toEqual([]);
    expect(pay.packFor(['personas'])).toBe(personas);

    const ventas = pay.packFor(['ventas']);
    expect(ventas.includedTools).toEqual([]);
    expect(ventas.knowledgeBase?.topics).toEqual([SELLER_MANUAL]);

    const both = pay.packFor(['ventas', 'personas']);
    expect(both.id).toBe('pay/personas&ventas');
    expect(both.playbook).toBe(`${PAY_SHARED}\n${PERSONAS}\n${VENTAS}`);
    expect(both.includedTools).toEqual(['get_persons']);
    expect(both.knowledgeBase?.topics).toEqual([{ ...SELLER_MANUAL, subdomains: ['ventas'] }]);
    expect(() => pay.packFor(['vehiculos'])).toThrow();
  });

  it('adds several subdomains in declaration order, whatever order the client used', () => {
    const server = { serverName: 'pms_api' as const, domain: 'pms', label: 'PMS', toolPrefix: '' };
    const domain = defineDomainWithSubdomains({
      shared: { server, playbook: 'shared' },
      subdomains: { a: { playbook: 'a', tools: ['x'] }, b: { playbook: 'b', tools: ['x', 'y'] } },
    });
    const pack = domain.packFor(['b', 'a']);
    expect(pack.id).toBe('pms/a&b');
    expect(pack.playbook).toBe('shared\na\nb');
    expect(pack.includedTools).toEqual(['x', 'y']);
  });

  it("joins the active subdomains' documents once each, naming the subdomains each one serves", () => {
    const server = { serverName: 'pay_api' as const, domain: 'pay', label: 'PAY', toolPrefix: '' };
    const doc = (title: string) => ({ title, covers: `questions on ${title}`, documentLocation: `${title}.md`, status: 'available' as const });
    const [general, a, b, c] = [doc('General'), doc('A'), doc('B'), doc('C')];
    const domain = defineDomainWithSubdomains({
      shared: { server, playbook: '', knowledgeBase: { namespace: 'PAY', searchTool: 'PAY__search_knowledge', topics: [general] } },
      subdomains: { personas: { playbook: '', topics: [a, b, c] }, vehiculos: { playbook: '', topics: [a, c] } },
    });

    const both = domain.packFor(['vehiculos', 'personas']).knowledgeBase!;
    expect(both.namespace).toBe('PAY');
    expect(both.topics.map((topic) => [topic.title, topic.subdomains])).toEqual([
      ['General', ['personas', 'vehiculos']],
      ['A', ['personas', 'vehiculos']],
      ['B', ['personas']],
      ['C', ['personas', 'vehiculos']],
    ]);
    expect(renderKnowledgeIndex(both)).toContain('- B (personas): questions on B.');

    const vehiculos = domain.packFor(['vehiculos']).knowledgeBase!;
    expect(vehiculos.topics).toEqual([general, a, c]);
    expect(renderKnowledgeIndex(vehiculos)).toContain('- A: questions on A.');
  });

  it('refuses subdomain documents when the domain has no knowledge base to search them', () => {
    const server = { serverName: 'pay_api' as const, domain: 'pay', label: 'PAY', toolPrefix: '' };
    const topics = [{ title: 'A', covers: 'a', documentLocation: 'a.md', status: 'available' as const }];
    expect(() => defineDomainWithSubdomains({ shared: { server, playbook: '' }, subdomains: { personas: { playbook: '', topics } } })).toThrow(
      /no knowledge base/
    );
  });
});
