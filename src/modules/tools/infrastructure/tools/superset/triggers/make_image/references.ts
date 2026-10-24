export const REFERENCE_IMAGES = {
  trendline: { title: 'Línea de tendencia', shows: 'a key number with its trendline below, pointed out' },
  filters: { title: 'Filtros', shows: 'the same chart before and after a filter (e.g. only one point of sale)' },
  time_range: { title: 'Rango de fechas', shows: 'a time axis cut to the last 30 days next to the whole history' },
  time_grain: { title: 'Intervalo de tiempo', shows: 'the same data grouped by day and by month' },
  series: { title: 'Series', shows: 'one line next to several lines, one per category' },
  stacked: { title: 'Apilado', shows: 'bars side by side, stacked and stacked to 100%' },
  axes: { title: 'Ejes X e Y', shows: 'a line chart with its x-axis (time or categories) and y-axis (values) pointed out' },
  axis_titles: { title: 'Títulos de los ejes', shows: 'a chart with a title next to each axis (e.g. sales in USD, months of the year)' },
  chart_title: { title: 'Título del gráfico', shows: 'the title above a chart' },
  legend: { title: 'Leyenda', shows: 'the legend pointed out, in its positions: top, bottom, left and right' },
  pie_labels: { title: 'Etiquetas de la torta', shows: 'pie labels with name, value and percentage, inside and outside the slices' },
  donut: { title: 'Torta y dona', shows: 'a pie next to a donut, and the size of the hole' },
  chart_types_trend: {
    title: 'Línea, barras, área y dispersión',
    shows: 'the four ways a trend or comparison chart can be drawn here: line, bar, area and scatter',
  },
  chart_types_overview: {
    title: 'Tipos de gráfico',
    shows: 'every chart family that can be created here: trend, pie or donut, key number, table and custom card',
  },
  table_grouped_raw: {
    title: 'Tabla agrupada o fila por fila',
    shows: 'the same data as a table with one row per record and as a table grouped by category',
  },
  number_format: { title: 'Formato de números', shows: 'one number abbreviated (1,25 M), as money with decimals and as a percentage' },
  color_palette: {
    title: 'Paletas de colores',
    shows: 'what a color palette is, with sample palettes; only an illustration: the palettes a chart can take are the ones its settings list',
  },
} as const satisfies Record<string, { title: string; shows: string }>;

export type ReferenceImageId = keyof typeof REFERENCE_IMAGES;

export const SHOWN_TOGETHER: readonly (readonly ReferenceImageId[])[] = [['chart_types_overview', 'chart_types_trend']];

export const withTheirSets = (references: readonly ReferenceImageId[]): ReferenceImageId[] => [
  ...new Set(references.flatMap((reference) => SHOWN_TOGETHER.find((set) => set.includes(reference)) ?? [reference])),
];

export const REFERENCE_IMAGE_IDS = Object.keys(REFERENCE_IMAGES) as [ReferenceImageId, ...ReferenceImageId[]];
