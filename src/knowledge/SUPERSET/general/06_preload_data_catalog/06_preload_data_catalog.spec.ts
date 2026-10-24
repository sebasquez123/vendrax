import { describe, expect, it } from '@jest/globals';
import type { ToolOutput } from '~/modules/tools/domain/interfaces/tool.types';
import { CATALOG, metricAggregation, PRELOAD, readDatasetHeaders, renderDatasetDetails } from './06_preload_data_catalog';
import type { DatasetHeader } from './interfaces';
import { SERVER } from '../../00_server/00_server';

describe('metricAggregation', () => {
  it.each([
    ['COUNT(*)', 'count'],
    ['COUNT(DISTINCT ACCOUNT_ID)', 'count distinct'],
    ['COUNT(\n  CASE WHEN "MOVEMENT_CATEGORY_DESC" = \'Recarga\' THEN 1 ELSE NULL END\n)', 'count'],
    ['SUM(\r\n CASE WHEN "MOVEMENT_CATEGORY_DESC" = \'Recarga\' THEN "VALUE_MONEY" ELSE 0.0 END\r\n)', 'sum'],
    ['COALESCE(COUNT(DISTINCT CASE WHEN "TYPE" = \'Online\' THEN "ID" END), 0)', 'count distinct'],
    ['COALESCE(COUNT(DISTINCT CASE WHEN "TYPE" = \'Offline\' THEN "ID" END) / NULLIF(COUNT(DISTINCT "ID"), 0), 0)', 'ratio'],
    ['SUM(CASE WHEN "X" = \'Recarga/Venta\' THEN 1 ELSE 0 END)', 'sum'],
    ['AVG(VALUE_MONEY)', 'average'],
    ['CASE WHEN 1 = 1 THEN 1 END', 'formula'],
    [null, 'formula'],
  ])('%s → %s', (expression, tag) => {
    expect(metricAggregation(expression)).toBe(tag);
  });
});

const header: DatasetHeader = { id: 123, tableName: 'ACCOUNT_MOVEMENTS_VIEW', businessName: 'Movimientos de cuentas' };

describe('readDatasetHeaders', () => {
  it('takes the business name from the list semantics and skips incomplete rows', () => {
    const headers = readDatasetHeaders({
      datasets: [
        { id: 123, table_name: 'ACCOUNT_MOVEMENTS_VIEW', description: null },
        { id: null, table_name: 'X' },
      ],
      _semantics: { catalog: { table_name: { values: { ACCOUNT_MOVEMENTS_VIEW: { business_hint: 'Movimientos de cuentas' } } } } },
    });
    expect(headers).toEqual([{ id: 123, tableName: 'ACCOUNT_MOVEMENTS_VIEW', businessName: 'Movimientos de cuentas', description: undefined }]);
  });
});

describe('renderDatasetDetails', () => {
  const block = renderDatasetDetails(header, {
    main_dttm_col: 'DATE',
    columns: [
      { column_name: 'DATE', verbose_name: '', type: 'DATE', is_dttm: true },
      { column_name: 'ACCOUNT_ID', verbose_name: null, type: 'BIGINT', is_dttm: false },
      { column_name: 'SELLER', verbose_name: 'VENDEDOR', type: 'VARCHAR', is_dttm: false },
      { column_name: 'VALUE_MONEY', verbose_name: 'VALOR DINERO', type: 'FLOAT', is_dttm: false },
    ],
    metrics: [
      { metric_name: 'Total recargas', verbose_name: 'Total recargas', expression: 'COUNT(CASE WHEN 1=1 THEN 1 END)' },
      { metric_name: 'Total', verbose_name: 'Recaudo', expression: 'SUM(VALUE_MONEY)' },
      { metric_name: 'Total_Validaciones', verbose_name: 'Total Validaciones', expression: 'COUNT(DISTINCT ID)' },
    ],
    _semantics: { catalog: { column_name: { values: { SELLER: { business_hint: 'Vendedor asociado al movimiento' } } } } },
  });

  it('puts the business label next to each technical name, preferring the glossary', () => {
    expect(block).toContain('SELLER "Vendedor asociado al movimiento"');
    expect(block).toContain('VALUE_MONEY "VALOR DINERO" [num]');
  });

  it('tags what each saved metric computes and omits a label equal to the name', () => {
    expect(block).toContain('Total recargas [count]');
    expect(block).toContain('Total_Validaciones [count distinct]');
    expect(block).toContain('Total "Recaudo" [sum]');
  });

  it('marks only decimal columns as amounts, never integer ids or codes', () => {
    expect(block).toContain('ACCOUNT_ID;');
    expect(block).not.toContain('ACCOUNT_ID [num]');
  });

  it('names the main date column and lists temporal columns apart', () => {
    expect(block).toContain('Main date column: DATE.');
    expect(block).toContain('- Date/time columns: DATE');
  });
});

/**
 * Herramientas de lectura simuladas
 * Simula las herramientas de lectura que responden con un objeto o un error, y respeta el filtro 'table_name in [...]'.
 */
const fakeTools = (listed: string[], details: Record<string, string[]>): ToolOutput[] =>
  [
    {
      name: `${SERVER.toolPrefix}list_datasets`,
      invoke: async ({ filters }: { filters?: { col: string; opr: string; value: string[] }[] }) => {
        const asked = filters?.find((filter) => filter.col === 'table_name' && filter.opr === 'in')?.value;
        const found = listed.flatMap((table_name, i) => (!asked || asked.includes(table_name) ? [{ id: i + 1, table_name }] : []));
        return { datasets: found, total_count: found.length };
      },
    },
    {
      name: `${SERVER.toolPrefix}get_dataset_info`,
      invoke: async ({ dataset_id }: { dataset_id: number }) => {
        const table = listed[dataset_id - 1]!;
        const metrics = details[table];
        return metrics ? { table_name: table, metrics: metrics.map((metric_name) => ({ metric_name })) } : 'Error: not available';
      },
    },
  ] as unknown as ToolOutput[];

const [MOVES, HISTORY, LOGS] = PRELOAD.datasets;

describe('CATALOG.build', () => {
  it('reads only the preloaded datasets, in PRELOAD order', async () => {
    const result = await CATALOG.build(fakeTools(['OTHER_TABLE', HISTORY, MOVES], { [MOVES]: ['Total ventas'], [HISTORY]: [], OTHER_TABLE: ['x'] }));
    expect([...(result?.inventory?.namesBySource.keys() ?? [])].sort()).toEqual([HISTORY, MOVES].sort());
    expect(result?.prompt.indexOf(MOVES)).toBeLessThan(result?.prompt.indexOf(HISTORY) ?? 0);
    expect(result?.prompt).not.toContain('OTHER_TABLE');
  });

  it('reports the names it read, and which preloaded datasets this user can see', async () => {
    const result = await CATALOG.build(fakeTools(['OTHER_TABLE', MOVES, HISTORY], { [MOVES]: ['Total ventas'], [HISTORY]: [] }));
    expect(result?.inventory?.visibleSources).toEqual([MOVES, HISTORY]);
    expect(result?.inventory?.listedSources).toEqual(PRELOAD.datasets);
    expect(result?.inventory?.namesBySource.get(MOVES)).toEqual({ metric: ['Total ventas'], column: [] });
  });

  it('leaves out of the names a dataset whose details could not be read, and lists it as unavailable', async () => {
    const result = await CATALOG.build(fakeTools([MOVES, LOGS], { [MOVES]: ['Total ventas'] }));
    expect(result?.inventory?.namesBySource.has(LOGS)).toBe(false);
    expect(result?.prompt).toContain('Details unavailable right now');
  });

  it('says so when this user can see none of them', async () => {
    const result = await CATALOG.build(fakeTools(['OTHER_TABLE'], {}));
    expect(result?.prompt).toContain('No dataset is available to this user');
  });
});
