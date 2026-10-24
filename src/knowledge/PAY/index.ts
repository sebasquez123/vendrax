import { defineDomainWithSubdomains } from '../define_pack';
import { SERVER } from './00_server/00_server';
import { PLAYBOOK } from './01_playbook/01_playbook';
import { KNOWLEDGE_BASE } from './05_knowledge_base/05_knowledge_base';
import { PERSONAS } from './personas';
import { VENTAS } from './ventas';

export const PAY = defineDomainWithSubdomains({
  shared: {
    server: SERVER,
    playbook: PLAYBOOK,
    knowledgeBase: KNOWLEDGE_BASE,
  },
  subdomains: {
    personas: PERSONAS,
    ventas: VENTAS,
  },
});
