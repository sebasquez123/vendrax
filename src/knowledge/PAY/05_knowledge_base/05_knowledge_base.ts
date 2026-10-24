import type { KnowledgeBase, KnowledgeTopic } from '../../types';
import { SERVER } from '../00_server/00_server';

export const SELLER_MANUAL: KnowledgeTopic = {
  title: 'Manual Usuario Operador Vendedor MET-PAY',
  covers:
    'what METPAY is and what it is for, which modules a seller has, how to log in, what happens when the user is inactive or not on shift, how to make recharges, sell cards and do account operations, how to manage routes, how the general menu works, how to search, sort, group or ungroup table records, show or hide columns and export to PDF, Excel or CSV',
  documentLocation: 'sharepoint/metpay/documentacion/manualesDeUsuario/manualUsuarioVendedor',
  status: 'available',
};

export const KNOWLEDGE_BASE: KnowledgeBase = {
  namespace: 'PAY',
  searchTool: `${SERVER.toolPrefix}search_knowledge`,
  preload: { enabled: false },
  topics: [],
};
