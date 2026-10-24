import type { ToolOutput } from '~/modules/tools/domain/interfaces/tool.types';
import type { CatalogInventory, CatalogResult, CatalogSource } from '../../../types';
import { SERVER } from '../../00_server/00_server';
import type { DatasetHeader, DatasetInfo, DatasetListing } from './interfaces';

export const PRELOAD = {
  datasets: ['ACCOUNT_MOVEMENTS_VIEW', 'VIEW_CONTRACT_BALANCE_HISTORY', 'VIEW_ACTIVITY_SUPERVISION_LOGS'],
  tools: { list: 'list_datasets', details: 'get_dataset_info' },
  listPageSize: 100,
} as const;

export const CATALOG: CatalogSource = { build: (tools) => buildDataCatalog(tools) };

/**
 * Construcción del catálogo de datos
 * Construye el catálogo de datos; devuelve null si falta una herramienta de lectura o el servidor respondió con error.
 */
const buildDataCatalog = async (tools: ToolOutput[]): Promise<CatalogResult | null> => {
  const listDatasets = findTool(tools, PRELOAD.tools.list);
  const getDatasetInfo = findTool(tools, PRELOAD.tools.details);
  if (!listDatasets || !getDatasetInfo) return null;

  /**- 1. Datasets precargados visibles para el usuario */
  const listing: unknown = await listDatasets.invoke({
    page: 1,
    page_size: PRELOAD.listPageSize,
    filters: [{ col: 'table_name', opr: 'in', value: [...PRELOAD.datasets] }],
  });
  if (!isObject(listing)) return null;
  const visible = readDatasetHeaders(listing as DatasetListing);
  const listedAll = ((listing as DatasetListing).total_count ?? visible.length) <= visible.length;

  /**- 2. Datasets visibles, en orden de PRELOAD */
  const datasets = PRELOAD.datasets.flatMap((tableName) => visible.filter((dataset) => dataset.tableName === tableName));
  if (!datasets.length) return { prompt: renderEmptyCatalog() };

  /**- 3. Columnas y métricas de cada dataset */
  const namesBySource = new Map<string, Record<string, string[]>>();
  const blocks = await Promise.all(
    datasets.map(async (dataset) => {
      const info: unknown = await getDatasetInfo.invoke({ dataset_id: dataset.id });
      if (!isObject(info)) return renderUnavailableDataset(dataset);
      const details = info as DatasetInfo;
      namesBySource.set(dataset.tableName, namesIn(details));
      return renderDatasetDetails(dataset, details);
    })
  );

  /**- 4. Bloque del catálogo e inventario hallado */
  const inventory: CatalogInventory = {
    namesBySource,
    visibleSources: listedAll ? visible.map((dataset) => dataset.tableName) : undefined,
    listedSources: PRELOAD.datasets,
  };
  return { prompt: renderCatalog(blocks), inventory };
};

const findTool = (tools: ToolOutput[], shortName: string) => tools.find((tool) => tool.name === `${SERVER.toolPrefix}${shortName}`);

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Encabezados de datasets listados
 * Datasets listados con el nombre de negocio del glosario (04); omite filas sin id o nombre.
 */
export const readDatasetHeaders = (listing: DatasetListing): DatasetHeader[] => {
  const businessNames = listing._semantics?.catalog?.table_name?.values ?? {};
  return (listing.datasets ?? []).flatMap((dataset) =>
    dataset.id && dataset.table_name
      ? [
          {
            id: dataset.id,
            tableName: dataset.table_name,
            businessName: cleanText(businessNames[dataset.table_name]?.business_hint),
            description: cleanText(dataset.description),
          },
        ]
      : []
  );
};

/**
 * Nombres de un dataset
 * Extrae los nombres de métricas y columnas de un dataset para la verificación de vocabulario.
 */
const namesIn = (details: DatasetInfo): Record<string, string[]> => ({
  metric: (details.metrics ?? []).flatMap((metric) => (metric.metric_name ? [metric.metric_name] : [])),
  column: (details.columns ?? []).flatMap((column) => (column.column_name ? [column.column_name] : [])),
});

/**
 * Agregación de una métrica
 * Deduce qué calcula una métrica por el inicio de su expresión SQL; las formas no reconocidas se etiquetan 'formula'.
 */
export const metricAggregation = (expression?: string | null): string => {
  let sql = (expression ?? '').replace(/\s+/g, ' ').trim();
  while (/^COALESCE\s*\(/i.test(sql)) sql = sql.replace(/^COALESCE\s*\(/i, '').trim();
  if (!sql) return 'formula';
  if (sql.replace(/'[^']*'/g, "''").includes('/')) return 'ratio';
  if (/^COUNT\s*\(\s*DISTINCT\b/i.test(sql)) return 'count distinct';
  if (/^COUNT\s*\(/i.test(sql)) return 'count';
  if (/^SUM\s*\(/i.test(sql)) return 'sum';
  if (/^AVG\s*\(/i.test(sql)) return 'average';
  if (/^MIN\s*\(/i.test(sql)) return 'min';
  if (/^MAX\s*\(/i.test(sql)) return 'max';
  return 'formula';
};

const CATALOG_INTRO =
  "Text in quotes is the business label: talk with it, but pass the technical name before it in tool arguments. '[num]' marks a column holding amounts that can be summed or averaged; the tag after a saved metric says what it computes.";

export const renderCatalog = (blocks: string[]): string => `
## Data catalog
These are the datasets you work with, with their columns and saved metrics. ${CATALOG_INTRO}
${blocks.join('\n\n')}
`;

export const renderEmptyCatalog = (): string => `
## Data catalog
No dataset is available to this user, so no chart can be created; existing charts and dashboards can still be read.
`;

/**
 * Dataset no disponible
 * Renderiza un dataset cuyos detalles no se pudieron leer esta vez, indicando cómo obtenerlos.
 */
export const renderUnavailableDataset = (dataset: DatasetHeader): string =>
  `### ${datasetTitle(dataset)}\nDetails unavailable right now: call 'get_dataset_info' for this dataset.`;

/**
 * Detalle de un dataset
 * Renderiza un dataset del catálogo detallado: columnas de fecha, métricas guardadas con su cálculo y luego las demás columnas.
 */
export const renderDatasetDetails = (dataset: DatasetHeader, details: DatasetInfo): string => {
  const glossary = details._semantics?.catalog?.column_name?.values ?? {};
  const labelOf = (column: { column_name?: string | null; verbose_name?: string | null }) =>
    glossary[column.column_name ?? '']?.business_hint ?? column.verbose_name;

  const columns = (details.columns ?? []).filter((column) => column.column_name);
  const dateColumns = columns.filter((column) => column.is_dttm).map((column) => withLabel(column.column_name!, labelOf(column)));
  const otherColumns = columns
    .filter((column) => !column.is_dttm)
    .map((column) => `${withLabel(column.column_name!, labelOf(column))}${AMOUNT_TYPES.test(column.type ?? '') ? ' [num]' : ''}`);
  const metrics = (details.metrics ?? [])
    .filter((metric) => metric.metric_name)
    .map((metric) => `${withLabel(metric.metric_name!, metric.verbose_name)} [${metricAggregation(metric.expression)}]`);

  return [
    `### ${datasetTitle({ ...dataset, description: dataset.description ?? cleanText(details.description) })}`,
    details.main_dttm_col ? `Main date column: ${details.main_dttm_col}.` : 'No main date column.',
    `- Date/time columns: ${dateColumns.join('; ') || 'none'}`,
    `- Saved metrics: ${metrics.join('; ') || 'none'}`,
    `- Other columns: ${otherColumns.join('; ') || 'none'}`,
  ].join('\n');
};

const AMOUNT_TYPES = /FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL/i;

const datasetTitle = (dataset: DatasetHeader): string => {
  const about = [dataset.businessName, dataset.description].filter(Boolean).join(' — ');
  return `Dataset ${dataset.id} · ${dataset.tableName}${about ? ` — ${about}` : ''}`;
};

/**
 * Nombre con etiqueta
 * Une el nombre técnico con su etiqueta cuando esta aporta algo; el nombre técnico es el que reciben los argumentos.
 */
const withLabel = (name: string, label?: string | null): string => {
  const text = cleanText(label);
  const sameWords = (a: string, b: string) => a.replace(/_/g, ' ').toLowerCase() === b.replace(/_/g, ' ').toLowerCase();
  return text && !sameWords(text, name) ? `${name} "${text}"` : name;
};

const cleanText = (text?: string | null): string | undefined => text?.replace(/\s+/g, ' ').trim() || undefined;
