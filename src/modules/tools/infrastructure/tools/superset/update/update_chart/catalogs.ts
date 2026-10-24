import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';
import { datasource_name, datasource_type, slice_names, viz_type } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';

export const activeFields = ['slice_name', 'viz_type', 'datasource_name', 'datasource_type'];

export const update_chart_catalog: ISemantics = {
  chart: {
    business_hint: 'Datos del gráfico actualizado',
    aliases: ['gráfico'],
  },
  previews: {
    business_hint: 'Vistas previas generadas del gráfico',
    aliases: ['vistas previas'],
  },
  capabilities: {
    business_hint: 'Funcionalidades disponibles para este tipo de gráfico',
    aliases: ['capacidades'],
  },
  semantics: {
    business_hint: 'Análisis automático de los datos del gráfico (hallazgos, resumen, anomalías)',
    aliases: ['análisis automático'],
  },
  embed_code: {
    business_hint: 'Código HTML para incrustar el gráfico en otra página',
    aliases: ['código de incrustación'],
  },
  api_endpoints: {
    business_hint: 'Rutas internas de la API usadas para operar sobre el gráfico',
    aliases: ['endpoints de api'],
  },
  form_data: {
    business_hint: 'Configuración completa del gráfico en el formato nativo del gestor de paneles',
    aliases: ['configuración nativa'],
  },
  form_data_key: {
    business_hint: 'Clave temporal que referencia la configuración cacheada del gráfico',
    aliases: ['clave de configuración'],
  },
  performance: {
    business_hint: 'Métricas de rendimiento de la consulta del gráfico',
    aliases: ['rendimiento'],
  },
  accessibility: {
    business_hint: 'Notas de accesibilidad del gráfico actualizado',
    aliases: ['accesibilidad'],
  },
  success: {
    business_hint: 'Indica si la operación se completó correctamente',
    aliases: ['éxito de la operación'],
  },
  error: {
    business_hint: 'Mensaje de error de la operación',
    aliases: ['error'],
  },
  warnings: {
    business_hint: 'Advertencias no bloqueantes sobre el gráfico actualizado',
    aliases: ['advertencias'],
  },
  schema_version: {
    business_hint: 'Versión del esquema de respuesta usado',
    aliases: ['versión de esquema'],
  },
  api_version: {
    business_hint: 'Versión de la API usada',
    aliases: ['versión de api'],
  },
  id: {
    business_hint: 'Identificador numérico del gráfico',
    aliases: ['id del gráfico'],
  },
  slice_name: {
    business_hint: 'Nombre del gráfico',
    aliases: ['título del gráfico', 'nombre de la visualización', 'nombre del grafico', 'titulo del chart', 'nombre del chart'],
    values: slice_names,
  },
  uuid: {
    business_hint: 'Identificador único universal del gráfico',
    aliases: ['uuid'],
  },
  viz_type: {
    business_hint: 'Tipo de visualización del gráfico',
    aliases: ['tipo de gráfico', 'tipologia del grafico', 'tipo de chart'],
    values: viz_type,
  },
  datasource_name: {
    business_hint: 'Fuente de datos del gráfico (esquema.tabla)',
    aliases: ['origen de datos'],
    values: datasource_name,
  },
  datasource_type: {
    business_hint: 'Tipo de fuente de datos (tabla física o consulta virtual)',
    aliases: ['tipo de fuente'],
    values: datasource_type,
  },
  url: {
    business_hint: 'Enlace directo al gráfico en el gestor de paneles',
    aliases: ['link', 'enlace'],
  },
  is_unsaved_state: {
    business_hint: 'Indica si hay cambios sin guardar sobre el gráfico',
    aliases: ['cambios sin guardar'],
  },
  metrics: {
    business_hint: 'Métricas (valores agregados) mostradas en el gráfico',
    aliases: ['métricas'],
  },
  x_axis: {
    business_hint: 'Columna usada en el eje X del gráfico',
    aliases: ['eje X'],
  },
  groupby: {
    business_hint: 'Columnas usadas para agrupar/desglosar los datos',
    aliases: ['agrupación', 'desglose'],
  },
  columns: {
    business_hint: 'Columnas incluidas en el gráfico',
    aliases: ['columnas'],
  },
  row_limit: {
    business_hint: 'Cantidad máxima de filas/puntos de datos que trae el gráfico',
    aliases: ['límite de filas'],
  },
  primary_insight: {
    business_hint: 'Hallazgo principal detectado automáticamente en los datos del gráfico',
    aliases: ['insight principal'],
  },
  data_story: {
    business_hint: 'Resumen narrativo automático de lo que muestran los datos',
    aliases: ['resumen de datos'],
  },
  recommended_actions: {
    business_hint: 'Acciones sugeridas a partir del análisis automático de los datos',
    aliases: ['recomendaciones'],
  },
  anomalies: {
    business_hint: 'Valores o comportamientos atípicos detectados en los datos',
    aliases: ['anomalías', 'valores atípicos'],
  },
  statistical_summary: {
    business_hint: 'Resumen estadístico de los datos del gráfico',
    aliases: ['resumen estadístico'],
  },
};
