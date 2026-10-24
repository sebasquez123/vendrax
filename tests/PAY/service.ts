import { join } from 'node:path';
import type { TestService } from '../core/types';
import { type PayCircuit, runPayCircuit } from './circuit';
import { PAY_GROUPS } from './circuits';

export const PAY_SERVICE: TestService = {
  id: 'PAY',
  label: 'PAY · METPAY',
  about:
    'el asistente responde a usuarios de PAY (METPAY): busca personas registradas (Pay__get_persons) y explica la plataforma según el manual del vendedor (Pay__search_knowledge). Solo debe usar herramientas de PAY.',
  catalogs: [{ id: 'circuits', label: 'Circuitos', groups: PAY_GROUPS }],
  reportsDir: join(__dirname, 'reports'),

  open: async (runtime) => {
    const pay = runtime.context.connection?.find((connection) => connection.server.serverName === 'pay_api');
    if (!pay) throw new Error("The connection has no 'pay_api': the handshake's scopes do not grant PAY.");
    return {
      target: 'PAY (sin estado de interfaz)',
      runCircuit: (circuit, repetition, judge) => runPayCircuit(runtime.conversation({ target: 'PAY' }), circuit as PayCircuit, repetition, judge),
      close: async () => [],
    };
  },

  whereToLook: () => [
    '**Cómo decide el agente:** lo común de PAY en `src/knowledge/PAY/` (00_server, 01_playbook, 05_knowledge_base) y lo de cada subdominio en `src/knowledge/PAY/<subdominio>/` (01_playbook, 08_tool_policy).',
    '**Herramientas de PAY:** `src/modules/tools/infrastructure/tools/pay/`; la búsqueda en el manual, `src/modules/tools/infrastructure/tools/rag/`.',
    '**La prueba:** casos en `tests/PAY/circuits/`; el juez en `tests/agent/judge/judge.prompt.ts`.',
  ],
};
