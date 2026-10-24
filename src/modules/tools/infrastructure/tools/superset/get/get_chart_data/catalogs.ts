import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';

export const activeFields = ['data_type', 'recommended_visualizations'];

export const get_chart_data_catalog: ISemantics = {
  chart_id: {
    business_hint: 'Identificador numérico del gráfico',
    aliases: ['id del gráfico'],
  },
  chart_name: {
    business_hint: 'Nombre del gráfico',
    aliases: ['título del gráfico'],
  },
  chart_type: {
    business_hint: 'Tipo de visualización del gráfico',
    aliases: ['tipo de gráfico'],
  },
  columns: {
    business_hint: 'Columnas incluidas en el resultado',
    aliases: ['columnas'],
  },
  name: {
    business_hint: 'Nombre técnico de la columna',
    aliases: ['nombre de la columna'],
  },
  display_name: {
    business_hint: 'Nombre visible de la columna para el usuario final',
    aliases: ['nombre para mostrar'],
  },
  data_type: {
    business_hint: 'Tipo de dato de la columna',
    aliases: ['tipo de dato'],
    values: {
      numeric: { business_hint: 'Columna numérica', aliases: ['número', ' columna numerica', 'dato de columna numerico'] },
      string: { business_hint: 'Columna de texto', aliases: ['texto', 'columna de texto'] },
    },
  },
  sample_values: {
    business_hint: 'Valores de ejemplo tomados de la columna',
    aliases: ['valores de ejemplo'],
  },
  null_count: {
    business_hint: 'Cantidad de valores vacíos en la columna',
    aliases: ['valores vacíos'],
  },
  unique_count: {
    business_hint: 'Cantidad de valores distintos en la columna',
    aliases: ['valores distintos'],
  },
  statistics: {
    business_hint: 'Estadísticas adicionales calculadas sobre la columna',
    aliases: ['estadísticas de columna'],
  },
  semantic_type: {
    business_hint: 'Categoría semántica detectada para la columna (ej. moneda, porcentaje)',
    aliases: ['tipo semántico'],
  },
  data: {
    business_hint: 'Filas de datos devueltas por el gráfico',
    aliases: ['resultados', 'valores'],
  },
  row_count: {
    business_hint: 'Cantidad de filas devueltas en esta respuesta',
    aliases: ['filas devueltas'],
  },
  total_rows: {
    business_hint: 'Cantidad total de filas disponibles',
    aliases: ['total de filas'],
  },
  data_freshness: {
    business_hint: 'Qué tan reciente es la información mostrada',
    aliases: ['frescura del dato'],
  },
  summary: {
    business_hint: 'Resumen automático en texto de lo que muestran los datos',
    aliases: ['resumen'],
  },
  insights: {
    business_hint: 'Observaciones automáticas sobre los datos (ej. si vienen frescos o cacheados)',
    aliases: ['observaciones automáticas'],
  },
  data_quality: {
    business_hint: 'Indicador de qué tan completos están los datos',
    aliases: ['calidad del dato', 'complejidad de los datos'],
  },
  recommended_visualizations: {
    business_hint: 'Tipos de gráfico sugeridos para representar estos datos',
    aliases: ['visualizaciones sugeridas'],
    values: {
      'bar chart': { business_hint: 'Gráfico de barras', aliases: ['barras'] },
      'scatter plot': { business_hint: 'Gráfico de dispersión', aliases: ['dispersión'] },
      'line chart': { business_hint: 'Gráfico de líneas', aliases: ['líneas'] },
      'time series': { business_hint: 'Serie temporal', aliases: ['temporal'] },
    },
  },
  performance: {
    business_hint: 'Métricas de rendimiento de la consulta (tiempo de respuesta, estado de caché)',
    aliases: ['rendimiento'],
  },
  cache_status: {
    business_hint: 'Estado de la caché usada para esta respuesta',
    aliases: ['estado de caché'],
  },
  csv_data: {
    business_hint: 'Datos exportados en formato CSV',
    aliases: ['exportación csv'],
  },
  excel_data: {
    business_hint: 'Datos exportados en formato Excel',
    aliases: ['exportación excel'],
  },
  format: {
    business_hint: 'Formato solicitado para el resultado',
    aliases: ['formato de salida'],
  },
  schema_version: {
    business_hint: 'Versión del esquema de respuesta usado',
    aliases: ['versión de esquema'],
  },
  api_version: {
    business_hint: 'Versión de la API usada',
    aliases: ['versión de api'],
  },
  error: {
    business_hint: 'Mensaje de error de la operación',
    aliases: ['error'],
  },
};
