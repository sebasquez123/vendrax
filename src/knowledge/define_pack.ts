import type { DomainPack, KnowledgeBase, KnowledgeDomain, KnowledgeTopic, RegisteredPack, ServerIdentity, VocabularyEntry } from './types';

/**
 * Registro de packs
 * Registra un pack enlazando su 07_client_state con su 09_open_turn; sin ellos no hay estado ni aporte por turno.
 */
export const definePack = <TState = undefined>(pack: DomainPack<TState>, id: string = pack.server.domain): RegisteredPack => {
  const { state: contract, openTurn, ...rest } = pack;
  return {
    ...rest,
    id,
    stateKey: contract?.stateContextKey,
    openTurn: (stateContext, base) => {
      const entry =
        contract && stateContext && Object.prototype.hasOwnProperty.call(stateContext, contract.stateContextKey)
          ? stateContext[contract.stateContextKey]
          : undefined;
      const parsed = contract ? contract.parse(entry) : { state: undefined as TState, issues: [] };
      return { turn: openTurn?.({ ...base, state: parsed.state }) ?? {}, issues: parsed.issues };
    },
  };
};

/**
 * Dominio con modos
 * Dominio con subdominios y modos: cada modo es un pack completo y el modo del turno elige el pack.
 */
export const defineDomainWithModes = ({
  server,
  subdomains,
}: {
  server: ServerIdentity;
  subdomains: Record<string, Record<string, RegisteredPack>>;
}): KnowledgeDomain => {
  /**- 1. ÁRBOL: el pack de cada modo, nombrado por su lugar */
  const tree = Object.fromEntries(
    Object.entries(subdomains).map(([subdomain, modes]) => [
      subdomain,
      Object.fromEntries(
        Object.entries(modes).map(([mode, pack]) => {
          const id = `${server.domain}/${subdomain}/${mode}`;
          if (!pack.mode) throw new Error(`Mode '${id}' has no 'mode' (label and description for the client's mode picker)`);
          return [mode, { ...pack, id }];
        })
      ),
    ])
  );

  return {
    server,
    modesBySubdomain: Object.fromEntries(Object.entries(tree).map(([subdomain, modes]) => [subdomain, Object.keys(modes)])),
    packs: Object.values(tree).flatMap((modes) => Object.values(modes)),
    /**- 2. TURNO: el pack del subdominio activo y el modo */
    packFor: (active, mode) => {
      const pack = active.length === 1 && mode ? tree[active[0]!]?.[mode] : undefined;
      if (!pack) throw new Error(`The '${server.domain}' tree has no pack for subdomain '${active.join('&')}' in mode '${mode}'`);
      return pack;
    },
  };
};

export interface SubdomainParts {
  playbook: string;
  vocabulary?: VocabularyEntry[];
  tools?: readonly string[];
  topics?: readonly KnowledgeTopic[];
}

/**
 * Dominio con subdominios
 * Dominio sin modos que escribe lo común una vez en 'shared' y suma el aporte propio de cada subdominio activo.
 */
export const defineDomainWithSubdomains = <TState = undefined>({
  shared,
  subdomains,
}: {
  shared: DomainPack<TState>;
  subdomains: Record<string, SubdomainParts>;
}): KnowledgeDomain => {
  const domain = shared.server.domain;
  const composed = new Map<string, RegisteredPack>();

  const compose = (active: readonly string[]): RegisteredPack => {
    /**- 1. PARTES ACTIVAS: subdominios en orden de declaración */
    const names = Object.keys(subdomains).filter((name) => active.includes(name));
    if (!names.length || names.length !== new Set(active).size)
      throw new Error(`The '${domain}' tree has no subdomain '${active.filter((name) => !names.includes(name)).join('&') || '(none)'}'`);
    const key = names.join('&');
    const cached = composed.get(key);
    if (cached) return cached;

    /**- 2. COMPONER: playbook, vocabulario, herramientas y documentos */
    const parts = names.map((name) => subdomains[name]!);
    const declared = [shared.includedTools, ...parts.map((part) => part.tools)].filter((tools): tools is readonly string[] => !!tools);
    const pack = definePack(
      {
        ...shared,
        playbook: [shared.playbook, ...parts.map((part) => part.playbook)].join('\n'),
        vocabulary: [...(shared.vocabulary ?? []), ...parts.flatMap((part) => part.vocabulary ?? [])],
        includedTools: declared.length ? [...new Set(declared.flat())] : undefined,
        knowledgeBase: composeKnowledgeBase(domain, shared.knowledgeBase, names, parts),
      },
      `${domain}/${key}`
    );
    composed.set(key, pack);
    return pack;
  };

  return {
    server: shared.server,
    modesBySubdomain: Object.fromEntries(Object.keys(subdomains).map((name) => [name, []])),
    packs: Object.keys(subdomains).map((name) => compose([name])),
    packFor: (active) => compose(active),
  };
};

/**
 * Base de conocimiento compuesta
 * Une los documentos compartidos con los de los subdominios activos, sin repetir los que aparecen en varios.
 */
const composeKnowledgeBase = (
  domain: string,
  shared: KnowledgeBase | undefined,
  names: string[],
  parts: SubdomainParts[]
): KnowledgeBase | undefined => {
  if (!shared) {
    if (parts.some((part) => part.topics?.length))
      throw new Error(`The '${domain}' subdomains list documents, but the domain has no knowledge base (05_knowledge_base) to search them`);
    return undefined;
  }

  const served = new Map<string, { topic: KnowledgeTopic; subdomains: Set<string> }>();
  const add = (topic: KnowledgeTopic, subdomains: string[]) => {
    const entry = served.get(topic.title) ?? { topic, subdomains: new Set<string>() };
    subdomains.forEach((name) => entry.subdomains.add(name));
    served.set(topic.title, entry);
  };
  shared.topics.forEach((topic) => add(topic, names));
  parts.forEach((part, index) => (part.topics ?? []).forEach((topic) => add(topic, [names[index]!])));

  const topics = [...served.values()].map(({ topic, subdomains }) =>
    names.length > 1 ? { ...topic, subdomains: names.filter((name) => subdomains.has(name)) } : topic
  );
  return { ...shared, topics };
};
