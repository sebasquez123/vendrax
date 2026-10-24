import { definePack } from '../../../define_pack';
import { SERVER } from '../../00_server/00_server';
import { STATE } from '../../07_client_state/07_client_state';
import { VOCABULARY } from '../03_vocabulary/03_vocabulary';
import { KNOWLEDGE_BASE } from '../05_knowledge_base/05_knowledge_base';
import { CATALOG } from '../06_preload_data_catalog/06_preload_data_catalog';
import { TOOL_LIMITS } from '../08_tool_policy/08_tool_policy';
import { openTurn } from '../09_open_turn/09_open_turn';
import { PLAYBOOK } from './01_playbook/01_playbook';
import { REPLY_SHAPES } from './02_reply_shapes/02_reply_shapes';
import { EXCLUDED_TOOLS } from './08_tool_policy/08_tool_policy';

export const ADVANCE = definePack({
  server: SERVER,
  playbook: PLAYBOOK,
  replyShapes: REPLY_SHAPES,
  vocabulary: VOCABULARY,
  knowledgeBase: KNOWLEDGE_BASE,
  catalog: CATALOG,
  state: STATE,
  toolCallLimits: TOOL_LIMITS,
  excludedTools: EXCLUDED_TOOLS,
  openTurn,
  mode: {
    label: 'Avanzado',
    description: 'Trabaja rapido: procesa tu pedido y realiza cambios en el gráfico de manera oportuna.',
  },
});
