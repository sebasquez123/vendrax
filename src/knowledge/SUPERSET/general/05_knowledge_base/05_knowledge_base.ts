import type { KnowledgeBase } from '../../../types';
import { SERVER } from '../../00_server/00_server';

export const KNOWLEDGE_BASE: KnowledgeBase = {
  namespace: 'SUPERSET',
  searchTool: `${SERVER.toolPrefix}search_knowledge`,
  preload: { enabled: false },
  topics: [
    {
      title: 'Metodología de creación y actualización de gráficos',
      covers:
        'which charts can be created or changed here, which parts of a saved chart can change and which cannot (and why), what each part of a chart is (filters, time grain, trendline, series, axes, legend, labels, palettes, formats, conditional formatting, totals, pivot tables, heatmaps, mixed charts, funnels…), what cannot be done on a dashboard, frequent questions',
      documentLocation: 'docs/SUPERSET/KNOWLEDGE/SUPERSET_METHODOLOGY.md',
      status: 'available',
    },
  ],
};
