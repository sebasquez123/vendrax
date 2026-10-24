import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';
import { dashboard_title, datasource_name, filter_type, slice_names, viz_type } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';

export const activeFields = ['slice_name', 'viz_type', 'datasource_name', 'dashboard_title', 'filter_type', 'targets'];
export const add_chart_to_existing_dashboard_catalog: ISemantics = {
  id: {
    business_hint: 'Identificador numérico',
    aliases: ['id', 'identificador', 'identifier'],
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
  datasource_name: {
    business_hint: 'Fuente de datos del gráfico (esquema.tabla)',
    aliases: ['fuente de datos', 'origen de datos'],
    values: datasource_name,
  },
  url: {
    business_hint: 'Enlace directo al recurso en el gestor de paneles',
    aliases: ['link', 'enlace'],
  },
  description: {
    business_hint: 'Descripción libre del recurso',
    aliases: ['descripción'],
  },
  dashboard_title: {
    business_hint: 'Título del dashboard',
    aliases: ['nombre del dashboard', 'nombre del tablero'],
    values: dashboard_title,
  },
  uuid: {
    business_hint: 'Identificador único universal del recurso',
    aliases: ['uuid'],
  },
  slug: {
    business_hint: 'Alias corto usado en la URL del dashboard',
    aliases: ['alias de url'],
  },
  css: {
    business_hint: 'Estilos visuales personalizados del dashboard',
    aliases: ['estilos personalizados'],
  },
  certified_by: {
    business_hint: 'Persona que certificó el recurso',
    aliases: ['certificador'],
  },
  certification_details: {
    business_hint: 'Detalle de la certificación del recurso',
    aliases: ['detalle de certificación'],
  },
  published: {
    business_hint: 'Estado de publicación del dashboard',
    aliases: ['estado del dashboard'],
  },
  is_managed_externally: {
    business_hint: 'Indica si el recurso se administra desde un sistema externo al gestor de paneles',
    aliases: ['gestión externa', 'lo manejan en otra plataforma'],
  },
  external_url: {
    business_hint: 'URL de administración externa del recurso',
    aliases: ['url externa'],
  },
  created_on: {
    business_hint: 'Fecha de creación',
    aliases: ['fecha de alta'],
  },
  changed_on: {
    business_hint: 'Fecha de la última modificación',
    aliases: ['última modificación'],
  },
  created_by: {
    business_hint: 'Usuario que creó el recurso',
    aliases: ['creador'],
  },
  changed_by: {
    business_hint: 'Usuario que hizo la última modificación',
    aliases: ['último editor'],
  },
  created_on_humanized: {
    business_hint: 'Fecha de creación en formato relativo (ej. "hace 2 meses")',
    aliases: ['hace cuánto se creó'],
  },
  changed_on_humanized: {
    business_hint: 'Fecha de última modificación en formato relativo',
    aliases: ['hace cuánto se modificó'],
  },
  chart_count: {
    business_hint: 'Cantidad de gráficos que tiene el dashboard',
    aliases: ['número de gráficos'],
  },
  charts: {
    business_hint: 'Lista de gráficos que componen el dashboard',
    aliases: ['gráficos del dashboard'],
  },
  native_filters: {
    business_hint: 'Filtros nativos configurados en el dashboard',
    aliases: ['filtros del dashboard'],
  },
  dashboard_url: {
    business_hint: 'Enlace directo al dashboard',
    aliases: ['enlace al dashboard'],
  },
  position: {
    business_hint: 'Ubicación del gráfico dentro de la cuadrícula del dashboard',
    aliases: ['ubicación en el layout'],
  },
  row: {
    business_hint: 'Fila del dashboard donde quedó ubicado el gráfico',
    aliases: ['fila del dashboard'],
  },
  chart_key: {
    business_hint: 'Identificador interno de la posición del gráfico en el layout',
    aliases: ['clave de posición'],
  },
  row_key: {
    business_hint: 'Identificador interno de la fila del layout',
    aliases: ['clave de fila'],
  },
  error: {
    business_hint: 'Mensaje de error de la operación',
    aliases: ['error'],
  },
  permission_denied: {
    business_hint: 'Indica que el usuario no tiene permiso de edición sobre el dashboard',
    aliases: ['sin permisos'],
  },
  name: {
    business_hint: 'Nombre del filtro nativo, tal como lo ve el usuario final',
    aliases: ['nombre del filtro', 'el filtro configurado'],
  },
  filter_type: {
    business_hint: 'Tipo de control de filtro nativo',
    aliases: ['tipo de filtro'],
    values: filter_type,
  },
  targets: {
    business_hint: 'Dataset y columna a los que aplica el filtro nativo',
    aliases: ['columna objetivo del filtro y su fuente de datos', 'la fuente y la columna filtrada'],
  },
};
