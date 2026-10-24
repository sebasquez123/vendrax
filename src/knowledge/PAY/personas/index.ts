import type { SubdomainParts } from '../../define_pack';
import { PLAYBOOK } from './01_playbook/01_playbook';
import { TOOLS } from './08_tool_policy/08_tool_policy';

export const PERSONAS: SubdomainParts = {
  playbook: PLAYBOOK,
  tools: TOOLS,
};
