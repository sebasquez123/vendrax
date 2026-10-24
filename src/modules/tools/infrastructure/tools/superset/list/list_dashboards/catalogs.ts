import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';
import { dashboard_title } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';

export const activeFields = ['dashboard_title'];

export const list_dashboards_catalog: ISemantics = {
  dashboards: {
    business_hint: 'Lista de dashboards encontrados',
    aliases: ['dashboards encontrados'],
  },
  count: {
    business_hint: 'Cantidad de dashboards en la página actual',
    aliases: ['cantidad en esta página'],
  },
  total_count: {
    business_hint: 'Cantidad total de dashboards que cumplen la búsqueda',
    aliases: ['total de dashboards'],
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
  error: {
    business_hint: 'Mensaje de error de la operación',
    aliases: ['error'],
  },
  id: {
    business_hint: 'Identificador numérico del dashboard',
    aliases: ['id del dashboard', 'id del tablero'],
  },
  uuid: {
    business_hint: 'Identificador único universal del dashboard',
    aliases: ['uuid'],
  },
  dashboard_title: {
    business_hint: 'Título del dashboard',
    aliases: ['nombre del dashboard', 'nombre del tablero'],
    values: dashboard_title,
  },
  slug: {
    business_hint: 'Alias corto usado en la URL del dashboard',
    aliases: ['alias de url'],
  },
  description: {
    business_hint: 'Descripción libre del dashboard',
    aliases: ['descripción'],
  },
  published: {
    business_hint: 'Estado de publicación del dashboard',
    aliases: ['estado del dashboard'],
  },
  chart_count: {
    business_hint: 'Cantidad de gráficos que tiene el dashboard',
    aliases: ['número de gráficos'],
  },
  changed_on: {
    business_hint: 'Fecha de la última modificación',
    aliases: ['última modificación'],
  },
  url: {
    business_hint: 'Enlace directo al dashboard en el gestor de paneles',
    aliases: ['link', 'enlace'],
  },
  certified_by: {
    business_hint: 'Persona que certificó el dashboard',
    aliases: ['certificador'],
  },
  certification_details: {
    business_hint: 'Detalle de la certificación del dashboard',
    aliases: ['detalle de certificación'],
  },
  changed_on_humanized: {
    business_hint: 'Fecha de última modificación en formato relativo',
    aliases: ['hace cuánto se modificó'],
  },
};
