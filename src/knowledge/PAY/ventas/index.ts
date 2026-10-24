import type { SubdomainParts } from '../../define_pack';
import { SELLER_MANUAL } from '../05_knowledge_base/05_knowledge_base';
import { PLAYBOOK } from './01_playbook/01_playbook';
import { TOOLS } from './08_tool_policy/08_tool_policy';

export const VENTAS: SubdomainParts = {
  playbook: PLAYBOOK,
  tools: TOOLS,
  topics: [SELLER_MANUAL],
};
