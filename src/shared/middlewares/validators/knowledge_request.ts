import type { KnowledgeDomain } from '~/knowledge/types';
import type { IClientServerPermission } from '~/modules/admin/domain/interfaces/authorization.interface';
import { DomainErrorCodes as e, MiddlewarePayloadError, MiddlewareUnauthorizedError } from '../errors';
export interface KnowledgeSelection {
  subdomains: string[];
  modes: string[];
}
const inconsistentError = (message: string) => new MiddlewarePayloadError(message, e.INCONSISTENT_KNOWLEDGE_REQUEST_ERROR);

export const verifyKnowledgeDomains = ({
  scopes,
  subdomains,
  modes,
  permissions,
  domains,
}: {
  scopes: string[];
  subdomains: string;
  modes: string;
  permissions: IClientServerPermission[];
  domains: KnowledgeDomain[];
}): Map<string, KnowledgeSelection> => {
  /**- 1. LEER: dominios y subdominios solicitados */
  const askedSubdomains = readGroups('subdomains', subdomains);
  const askedModes = readGroups('modes', modes);

  const selection = new Map<string, KnowledgeSelection>();
  for (const scope of scopes) {
    /**- 2. DOMINIO: cada servidor tiene dominio de conocimiento */
    const domain = domains.find((candidate) => candidate.server.serverName === scope);
    if (!domain) throw new MiddlewarePayloadError(`Scope '${scope}' has no knowledge domain, so it cannot be connected`, e.NO_KNOWLEDGE_DOMAIN_ERROR);
    const key = domain.server.domain;

    /**- 3. NOMBRADO: aparece en subdominios y modos */
    const subs = askedSubdomains.get(key);
    if (!subs?.length)
      throw inconsistentError(
        `'subdomains' must name at least one subdomain of '${key}' (available: ${Object.keys(domain.modesBySubdomain).join(', ')})`
      );
    const asked = askedModes.get(key);
    if (!asked) throw inconsistentError(`'modes' must name '${key}': with its modes, or alone ('${key}') when it takes none`);

    /**- 4. SUBDOMINIOS: existen y están permitidos */
    const permitted = permissions.find((permission) => permission.name === scope)?.subdomains ?? [];
    for (const sub of subs) {
      if (!(sub in domain.modesBySubdomain)) throw inconsistentError(`Subdomain '${key}.${sub}' does not exist`);
      if (!permitted.some((permission) => permission.name === sub))
        throw new MiddlewareUnauthorizedError(`Subdomain '${key}.${sub}' is not permitted for this client`, e.NO_AUTHORIZED_SUBDOMAIN_ERROR);
    }

    /**- 5. MODOS: según el dominio, uno o ninguno */
    const takesModes = Object.values(domain.modesBySubdomain).some((available) => available.length > 0);
    if (!takesModes && asked.length) throw inconsistentError(`'${key}' takes no mode: name it alone in 'modes' ('${key}')`);
    if (takesModes) {
      const sub = subs[0]!;
      if (subs.length > 1) throw inconsistentError(`'${key}' works with one subdomain at a time`);
      if (!asked.length)
        throw inconsistentError(`'modes' must name at least one mode of '${key}.${sub}' (available: ${domain.modesBySubdomain[sub]!.join(', ')})`);
      const permittedModes = permitted.find((permission) => permission.name === sub)?.modes ?? [];
      for (const mode of asked) {
        if (!domain.modesBySubdomain[sub]!.includes(mode)) throw inconsistentError(`Mode '${key}.${mode}' does not exist in '${key}.${sub}'`);
        if (!permittedModes.includes(mode))
          throw new MiddlewareUnauthorizedError(`Mode '${key}.${mode}' is not permitted for this client`, e.NO_AUTHORIZED_MODE_ERROR);
      }
    }

    selection.set(scope, { subdomains: subs, modes: asked });
  }

  /**- 6. SIN EXTRAS: solo dominios solicitados */
  const requested = new Set(domains.filter((domain) => selection.has(domain.server.serverName)).map((domain) => domain.server.domain));
  const extra = [...askedSubdomains.keys(), ...askedModes.keys()].find((key) => !requested.has(key));
  if (extra) throw inconsistentError(`'${extra}' is named in 'subdomains' or 'modes', but none of the requested scopes is that domain`);

  return selection;
};
/**
 * Lectura de grupos solicitados
 * Convierte 'a.b.c&d' en { a: [b, c], d: [] }; rechaza dominios repetidos y deduplica los elementos repetidos.
 */
const readGroups = (field: string, raw: string): Map<string, string[]> => {
  const groups = new Map<string, string[]>();
  for (const group of raw
    .split('&')
    .map((part) => part.trim())
    .filter(Boolean)) {
    const [key, ...items] = group.split('.').map((part) => part.trim());
    if (!key || items.some((item) => !item)) throw inconsistentError(`'${field}' has an empty name in '${group}'`);
    if (groups.has(key)) throw inconsistentError(`'${field}' names '${key}' twice`);
    groups.set(key, [...new Set(items)]);
  }
  return groups;
};
