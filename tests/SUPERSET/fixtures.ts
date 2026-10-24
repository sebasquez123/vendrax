import type { Params } from './harness/superset';

export const BASE_DATASET = 'ACCOUNT_MOVEMENTS_VIEW';

export const BASE_CHARTS: Record<
  'pivot' | 'heatmap' | 'mixed' | 'funnel',
  { name: string; article: string; vizType: string; build: string; lookalikes?: Record<string, string> }
> = {
  pivot: {
    name: 'tabla dinámica',
    article: 'la',
    vizType: 'pivot_table_v2',
    build:
      'Tabla dinámica (Pivot Table) con MEDIO_VALIDACION en filas, sin columnas, la métrica Total recaudo por ventas, agregación Sum y sin totales.',
  },
  heatmap: {
    name: 'mapa de calor',
    article: 'el',
    vizType: 'heatmap_v2',
    build:
      'Mapa de calor (Heatmap, no deck.gl Heatmap) con DATE en el eje X por mes, MEDIO_VALIDACION en el eje Y y la métrica Total recaudo por ventas; el resto por defecto.',
    lookalikes: { deck_heatmap: 'deck.gl Heatmap, un mapa geográfico sin eje Y' },
  },
  mixed: {
    name: 'gráfico combinado',
    article: 'el',
    vizType: 'mixed_timeseries',
    build:
      'Gráfico combinado (Mixed Chart) con DATE en el eje X por mes; consulta A: Total recaudo por ventas en línea; consulta B: transacciones en línea; ambas en el eje principal.',
  },
  funnel: {
    name: 'embudo',
    article: 'el',
    vizType: 'funnel',
    build: 'Embudo (Funnel Chart) con MEDIO_VALIDACION como etapas y la métrica Total recaudo por ventas; el resto por defecto.',
  },
};

export type BaseChartKind = keyof typeof BASE_CHARTS;

export const baseChartName = (kind: BaseChartKind): string => `${BASE_CHARTS[kind].article} ${BASE_CHARTS[kind].name} base`;

export interface Production {
  sqlMetrics?: { label: string; sql: string }[];
  sqlFilters?: string[];
  timeRange?: { column: string; range: string };
  set?: Params;
}

export const productionSettings =
  ({ sqlMetrics = [], sqlFilters = [], timeRange, set = {} }: Production) =>
  (params: Params): Params => {
    const list = (key: string): unknown[] => (Array.isArray(params[key]) ? (params[key] as unknown[]) : []);
    const filters = list('adhoc_filters').filter(
      (filter) =>
        !(
          timeRange &&
          (filter as { subject?: unknown; operator?: unknown })?.subject === timeRange.column &&
          (filter as { operator?: unknown }).operator === 'TEMPORAL_RANGE'
        )
    );
    return {
      ...(sqlMetrics.length && {
        metrics: [
          ...list('metrics'),
          ...sqlMetrics.map(({ label, sql }, index) => ({
            expressionType: 'SQL',
            sqlExpression: sql,
            label,
            hasCustomLabel: true,
            optionName: `metric_e2e_sql_${index}`,
          })),
        ],
      }),
      ...((sqlFilters.length || timeRange) && {
        adhoc_filters: [
          ...filters,
          ...(timeRange
            ? [
                {
                  expressionType: 'SIMPLE',
                  subject: timeRange.column,
                  operator: 'TEMPORAL_RANGE',
                  comparator: timeRange.range,
                  clause: 'WHERE',
                  sqlExpression: null,
                  isExtra: false,
                  isNew: false,
                  filterOptionName: 'filter_e2e_range',
                },
              ]
            : []),
          ...sqlFilters.map((sql, index) => ({
            expressionType: 'SQL',
            sqlExpression: sql,
            clause: 'WHERE',
            subject: null,
            operator: null,
            comparator: null,
            isExtra: false,
            isNew: false,
            filterOptionName: `filter_e2e_sql_${index}`,
          })),
        ],
      }),
      ...set,
    };
  };
