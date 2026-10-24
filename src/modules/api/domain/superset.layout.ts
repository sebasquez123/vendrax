export type DashboardLayout = Record<string, unknown>;

interface LayoutComponent {
  type?: string;
  children?: string[];
  meta?: { chartId?: unknown };
}

const DISPOSABLE_CONTAINERS = ['ROW', 'COLUMN'];

const isComponent = (value: unknown): value is LayoutComponent => typeof value === 'object' && value !== null && !Array.isArray(value);
const chartOf = (component: LayoutComponent): number | undefined =>
  component.type === 'CHART' && component.meta?.chartId !== undefined ? Number(component.meta.chartId) : undefined;

export const chartsInLayout = (layout: DashboardLayout): Set<number> =>
  new Set(
    Object.values(layout)
      .filter(isComponent)
      .map(chartOf)
      .filter((id): id is number => id !== undefined)
  );

export const removeChartFromLayout = (layout: DashboardLayout, chartId: number): DashboardLayout => {
  const next = structuredClone(layout);

  const remove = (id: string): void => {
    delete next[id];
    for (const [parentId, parent] of Object.entries(next)) {
      if (!isComponent(parent) || !parent.children?.includes(id)) continue;
      parent.children = parent.children.filter((child) => child !== id);
      if (!parent.children.length && DISPOSABLE_CONTAINERS.includes(parent.type ?? '')) remove(parentId);
    }
  };

  for (const [id, component] of Object.entries(layout)) if (isComponent(component) && chartOf(component) === chartId && id in next) remove(id);
  return next;
};
