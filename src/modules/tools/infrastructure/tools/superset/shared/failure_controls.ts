import { ToolMessage } from 'langchain';
import { DomainError } from '~/shared/filters/http-exception.filter';
import { DomainErrorCodes as e } from '~/modules/api/domain/errors';

export const toolFailureOf = (message: ToolMessage): string | undefined => {
  const content = typeof message.content === 'string' ? message.content : message.text || JSON.stringify(message.content ?? '');
  if (/^\s*NOT (EXECUTED|UPDATED)\b/.test(content)) return undefined;

  if (/did not match expected schema/i.test(content)) return undefined;

  if (message.status === 'error' || /^\s*Error\b/.test(content)) return content.slice(0, 200);

  try {
    const parsed = JSON.parse(content) as { success?: unknown; isError?: unknown; error?: unknown } | null;
    if (parsed && typeof parsed === 'object' && (parsed.success === false || parsed.isError === true)) {
      const error = parsed.error as { message?: unknown } | string | undefined;
      const reason = typeof error === 'string' ? error : typeof error?.message === 'string' ? error.message : 'the tool answered success: false';
      return reason.slice(0, 200);
    }
  } catch {
    return undefined;
  }
  return undefined;
};

/**
 * Explicación de errores de API
 * Explica al usuario por qué la API REST no aceptó una escritura; 'notOwner' indica quién sí puede hacerlo.
 */
export const explainApiError = (error: unknown, notOwner: string): string => {
  if (!(error instanceof DomainError)) return 'the change could not be saved; nothing changed. Retry later.';
  switch (error.code) {
    case e.NOT_OWNER_ERROR:
      return notOwner;
    case e.NOT_FOUND_ERROR:
      return 'it was not found; it may have been deleted.';
    case e.SESSION_EXPIRED_ERROR:
      return 'the session with the dashboard manager expired; nothing changed. Ask the user to send the request again.';
    case e.UNSAVED_LAYOUT_ERROR:
      return 'this dashboard has charts that are not in its saved layout yet (added from the chart editor); nothing changed. The user has to open the dashboard in the dashboard manager, save it once, and ask again.';
    case e.REJECTED_ERROR:
      return `the dashboard manager rejected the change (${error.message}); nothing changed.`;
    default:
      return 'the dashboard manager could not be reached; nothing changed. Retry later.';
  }
};
