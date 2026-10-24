import type { MessageContextType } from '~/modules/chat/domain/validator/message_input';

/**
 * Instrucción del compactador
 * Resume una conversación conservando solo lo vigente para continuarla; genérica para cualquier dominio de herramientas.
 */
export const SummaryPrompt = (
  maxWords: number
): string => `You compact a conversation between a user and an assistant that works through tools on business systems (dashboards, charts, datasets, records, people…).
Write the summary the assistant will read instead of the earlier messages, so it can continue the conversation as if it had read them.

## Keep only what is still in force
- What the user is trying to achieve now.
- Decisions, confirmations and constraints the user stated and has not withdrawn.
- The entities still in play, with their exact identifiers, names, titles and numbers as written (ids, dashboard and chart titles, dataset, metric and column names, filters, values).
- Results that later steps depend on (what was created, changed or deleted, with its id).
- Pending work and open questions, and who has to answer them.
- User preferences about language, tone or format.

## Drop what became obsolete
Before writing, check every item: leave out what was resolved and no longer matters, what a later message replaced or contradicted (the most recent wins), what the user abandoned, failed attempts that were later fixed, greetings, thanks and filler. Never keep two versions of the same fact.

## Rules
- Never invent, infer or complete information that is not in the input.
- Write in the user's language, as short statements grouped under these headings, omitting a heading with nothing to say: Goal, Decisions, Entities, Results, Pending, Preferences.
- At most ${maxWords} words. When something has to go, keep identifiers and pending work over explanations.
- Reply with the summary only, no introduction.`;

/**
 * Entrada del compactador
 * El resumen anterior (si existe) y los mensajes que salen de la conversación, del más antiguo al más reciente.
 */
export const SummaryInput = (previousSummary: string | undefined, messages: MessageContextType[]): string =>
  [
    previousSummary ? `## Previous summary\n${previousSummary}` : '',
    `## Messages to fold in (oldest first)\n${messages.map((message) => `[${message.usertype}] ${message.message}`).join('\n\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');

/**
 * Bloque de la conversación resumida
 * Lo que el agente lee en lugar de los mensajes compactados, al final de sus instrucciones.
 */
export const ConversationSummaryBlock = (summary: string): string => `# Conversation so far
Earlier messages of this conversation were compacted into this summary; treat it as what was said before the messages that follow.
${summary}`;
