/**
 * Tipos del catálogo de datos
 * Define los tipos del catálogo de datos 06: las respuestas del servidor que lee y lo que conserva de ellas.
 */

export type BusinessHints = Record<string, { business_hint?: string } | undefined>;

export interface DatasetListing {
  datasets?: { id?: number | null; table_name?: string | null; description?: string | null }[] | null;
  total_count?: number | null;
  _semantics?: { catalog?: { table_name?: { values?: BusinessHints } } };
}

export interface DatasetInfo {
  id?: number | null;
  table_name?: string | null;
  description?: string | null;
  main_dttm_col?: string | null;
  columns?: { column_name?: string | null; verbose_name?: string | null; type?: string | null; is_dttm?: boolean | null }[] | null;
  metrics?: { metric_name?: string | null; verbose_name?: string | null; expression?: string | null }[] | null;
  _semantics?: { catalog?: { column_name?: { values?: BusinessHints } } };
}

export interface DatasetHeader {
  id: number;
  tableName: string;
  businessName?: string;
  description?: string;
}
