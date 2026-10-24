import type { KnowledgeDomain } from './types';
import { SUPERSET } from './SUPERSET';
import { PAY } from './PAY';

export const KNOWLEDGE_DOMAINS: KnowledgeDomain[] = [SUPERSET, PAY];

export const findKnowledgeDomain = (serverName: string): KnowledgeDomain | undefined =>
  KNOWLEDGE_DOMAINS.find((domain) => domain.server.serverName === serverName);
