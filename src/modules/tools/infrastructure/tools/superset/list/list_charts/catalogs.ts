import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';
import { datasource_name, datasource_type, slice_names, viz_type } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';

export const activeFields = ['slice_name', 'viz_type', 'datasource_type', 'datasource_name'];

export const list_charts_catalog: ISemantics = {
  count: {
    business_hint: 'Cantidad de gráficos devueltos en esta página',
    aliases: ['cantidad en esta página'],
  },
  total_count: {
    business_hint: 'Cantidad total de gráficos que cumplen la búsqueda',
    aliases: ['total de gráficos'],
  },
  total_pages: {
    business_hint: 'Cantidad total de páginas de resultados',
    aliases: ['total de páginas'],
  },
  has_previous: {
    business_hint: 'Indica si existe una página anterior de resultados',
    aliases: ['hay página anterior'],
  },
  has_next: {
    business_hint: 'Indica si existe una siguiente página de resultados',
    aliases: ['hay más resultados'],
  },
  timestamp: {
    business_hint: 'Momento en que se generó la respuesta',
    aliases: ['fecha de la respuesta'],
  },
  page: {
    business_hint: 'Número de página actual (empieza en 1)',
    aliases: ['página'],
  },
  page_size: {
    business_hint: 'Cantidad de resultados por página',
    aliases: ['tamaño de página'],
  },
  charts: {
    business_hint: 'Lista de gráficos encontrados',
    aliases: ['gráficos del dashboard'],
  },
  error: {
    business_hint: 'Mensaje de error de la operación',
    aliases: ['error'],
  },
  id: {
    business_hint: 'Identificador numérico del gráfico',
    aliases: ['id del gráfico'],
  },
  uuid: {
    business_hint: 'Identificador único universal del gráfico',
    aliases: ['uuid'],
  },
  slice_name: {
    business_hint: 'Nombre del gráfico',
    aliases: ['título del gráfico', 'nombre de la visualización', 'nombre del grafico', 'titulo del chart', 'nombre del chart'],
    values: slice_names,
  },
  viz_type: {
    business_hint: 'Tipo de visualización del gráfico',
    aliases: ['tipo de gráfico', 'tipologia del grafico', 'tipo de chart'],
    values: viz_type,
  },
  datasource_id: {
    business_hint: 'Identificador del dataset que alimenta el gráfico',
    aliases: ['id de la fuente de datos'],
  },
  datasource_type: {
    business_hint: 'Tipo de fuente de datos (tabla física o consulta virtual)',
    aliases: ['tipo de fuente'],
    values: datasource_type,
  },
  datasource_name: {
    business_hint: 'Fuente de datos del gráfico (esquema.tabla)',
    aliases: ['origen de datos'],
    values: datasource_name,
  },
  description: {
    business_hint: 'Descripción libre del gráfico',
    aliases: ['descripción'],
  },
  url: {
    business_hint: 'Enlace directo al gráfico en el gestor de paneles',
    aliases: ['link', 'enlace'],
  },
  form_data: {
    business_hint: 'Configuración completa del gráfico en el formato nativo del gestor de paneles',
    aliases: ['configuración nativa'],
  },
  changed_on: {
    business_hint: 'Fecha de la última modificación',
    aliases: ['última modificación'],
  },
  changed_on_humanized: {
    business_hint: 'Fecha de última modificación en formato relativo',
    aliases: ['hace cuánto se modificó'],
  },
  certified_by: {
    business_hint: 'Persona que certificó el gráfico',
    aliases: ['certificador'],
  },
  certification_details: {
    business_hint: 'Detalle de la certificación del gráfico',
    aliases: ['detalle de certificación'],
  },
};
