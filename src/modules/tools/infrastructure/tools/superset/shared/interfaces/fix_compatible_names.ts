export type FormData = Record<string, unknown>;

export interface Filter {
  expressionType?: string;
  subject?: unknown;
  operator?: unknown;
  comparator?: unknown;
  sqlExpression?: unknown;
}

export interface SavedData {
  metrics: string[];
  x_axis?: string;
  grouped_by?: string[];
  columns?: string[];
  time_grain?: string;
  filters: string[] | 'none';
}
