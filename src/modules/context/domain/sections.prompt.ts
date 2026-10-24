import type { CatalogInventory, KnowledgeBase, KnowledgeTopic, RegisteredPack, VocabularyEntry, VocabularyTarget } from '~/knowledge/types';
import type { SectionPart, VocabularyCheck, VocabularyDrift } from './interfaces/context.interfaces';

export const SECTION_PARTS: SectionPart[] = ['instructions', 'knowledge', 'data', 'current state'];

/**
 * Sección de prompt por servidor
 * Renderiza la parte del prompt de un servidor bajo su encabezado de convención; no devuelve nada si está vacía.
 */
export const renderSection = (label: string, part: SectionPart, blocks: (string | null | undefined)[]): string => {
  const body = blocks
    .map((block) => block?.trim())
    .filter(Boolean)
    .join('\n\n');
  return body ? `# ${label} · ${part}\n${body}` : '';
};

/**
 * Instrucciones por defecto del servidor
 * Un servidor conectado sin playbook igual se identifica, para que sus herramientas se usen según su descripción.
 */
export const renderFallbackInstructions = (): string =>
  'No specific instructions for this server yet: use its tools only for what their descriptions say, never invent capabilities, and tell the user plainly when something is not available.';

const quoted = (terms: string[]): string => terms.map((term) => `"${term}"`).join(' / ');

const target = (item: VocabularyTarget): string => `${item.kind} ${item.name} (${item.source}): ${item.meaning}`;

/**
 * Vocabulario de negocio del equipo
 * Resuelve los términos del usuario antes de comparar nombres: no adivina términos conocidos y siempre pregunta ante ambigüedades conocidas.
 */
export const renderVocabulary = (entries: VocabularyEntry[] = []): string => {
  if (!entries.length) return '';
  const lines = entries.map((entry) => {
    const note = entry.note ? ` ${entry.note}` : '';
    if (entry.refersTo.length === 1) return `- ${quoted(entry.terms)} → ${target(entry.refersTo[0]!)}.${note}`;
    return `- ${quoted(entry.terms)} → ambiguous, ask which one: ${entry.refersTo.map(target).join('; or ')}.${note}`;
  });
  return `## Business vocabulary
How users name things, as the team defined it. It decides first, before matching names or labels; the data catalog wins only when a name here is missing from it.
${lines.join('\n')}`;
};

/**
 * Temas de conocimiento disponibles
 * Solo documentos ya ingestados; uno planificado nunca se anuncia, o el agente buscaría algo inexistente.
 */
export const availableTopics = (knowledgeBase?: KnowledgeBase): KnowledgeTopic[] =>
  (knowledgeBase?.topics ?? []).filter((topic) => topic.status === 'available');

/**
 * Índice de base de conocimiento
 * Nombra la herramienta de búsqueda propia de cada servidor, para buscar cada pregunta en los documentos de su servidor.
 */
export const renderKnowledgeIndex = (knowledgeBase?: KnowledgeBase): string => {
  const available = availableTopics(knowledgeBase);
  if (!knowledgeBase || !available.length) return '';
  const serving = available.some((topic) => topic.subdomains?.length)
    ? '\nEach document names, in parentheses, the topics of this conversation it serves: pick the search by the topic of the question.'
    : '';
  const line = (topic: KnowledgeTopic) => `- ${topic.title}${topic.subdomains?.length ? ` (${topic.subdomains.join(', ')})` : ''}: ${topic.covers}.`;
  return `## Knowledge base
'${knowledgeBase.searchTool}' searches only these documents; they may not cover every detail:${serving}
${available.map(line).join('\n')}`;
};

/**
 * Validación del vocabulario
 * Contrasta el vocabulario con lo que el servidor tiene para el usuario, para que un renombre aparezca en los logs.
 */
export const checkVocabulary = (entries: VocabularyEntry[], inventory: CatalogInventory): VocabularyCheck => {
  const drifted: VocabularyDrift[] = [];
  const unseenSources = new Set<string>();
  for (const entry of entries) {
    for (const pointed of entry.refersTo) {
      const names = inventory.namesBySource.get(pointed.source);
      if (names) {
        if (!(names[pointed.kind] ?? []).includes(pointed.name)) drifted.push({ terms: entry.terms, target: pointed });
      } else {
        const asked = !inventory.listedSources || inventory.listedSources.includes(pointed.source);
        if (asked && inventory.visibleSources && !inventory.visibleSources.includes(pointed.source)) unseenSources.add(pointed.source);
      }
    }
  }
  return { drifted, unseenSources: [...unseenSources] };
};

/**
 * Verificación de un pack
 * Lista lo que falta en un pack para el log de arranque: 00 y 01 obligatorios, los opcionales consistentes.
 */
export const checkPack = (pack: RegisteredPack): string[] => {
  const issues: string[] = [];
  const { server } = pack;
  if (!server.serverName || !server.label) issues.push('00_server: serverName and label are required');
  if (!pack.playbook.trim()) issues.push('01_playbook is empty: the agent only knows this server by its tool descriptions');
  (pack.vocabulary ?? []).forEach((entry, index) => {
    if (!entry.terms.length || !entry.refersTo.length) issues.push(`03_vocabulary entry ${index}: needs at least one term and one target`);
  });
  if (pack.knowledgeBase && (!pack.knowledgeBase.namespace || !pack.knowledgeBase.searchTool))
    issues.push('05_knowledge_base: the namespace and the search tool name are required');
  return issues;
};

/**
 * Verificación entre packs
 * Dos servidores nunca deben compartir namespace de base de conocimiento ni nombre de herramienta de búsqueda.
 */
export const checkPacks = (packs: RegisteredPack[]): string[] => {
  const issues: string[] = [];
  const seen = { namespace: new Map<string, RegisteredPack>(), searchTool: new Map<string, RegisteredPack>() };
  for (const pack of packs) {
    if (!pack.knowledgeBase) continue;
    for (const key of ['namespace', 'searchTool'] as const) {
      const value = pack.knowledgeBase[key];
      const owner = seen[key].get(value);
      if (owner && owner.server.serverName !== pack.server.serverName)
        issues.push(`05_knowledge_base: '${pack.server.label}' and '${owner.server.label}' share the ${key} '${value}'`);
      else if (!owner) seen[key].set(value, pack);
    }
  }
  return issues;
};
