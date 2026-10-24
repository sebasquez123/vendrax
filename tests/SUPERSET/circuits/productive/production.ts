import type { BaseChartKind } from '../../fixtures';
import type { Circuit, Step } from '../../harness/circuit';
import { oneOf } from '../../harness/checks';

export const PRODUCTIVE_DATASET = 'ACCOUNT_MOVEMENTS_VIEW';

export const TABLE_VIZ = oneOf('table', 'ag-grid-table');

export interface ProductionChart {
  chartId: number;
  sliceName: string;
  base?: BaseChartKind;
  steps: Step[];
}

/**
 * Nombre del chart sandbox
 * Nombre del chart creado en el sandbox para un chart de producción: 'E2E prod <id>'.
 */
export const sandboxName = (chartId: number): string => `E2E prod ${chartId}`;

export const productionCircuit = ({ chartId, sliceName, base, steps }: ProductionChart): Circuit => ({
  id: `prod-${chartId}`,
  name: `${chartId} · ${sliceName}`,
  dataset: PRODUCTIVE_DATASET,
  ...(base && { base }),
  steps,
});
