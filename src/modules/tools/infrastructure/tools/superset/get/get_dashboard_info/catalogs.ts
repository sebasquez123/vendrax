import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';
import { dashboard_title, datasource_name, filter_type, slice_names, viz_type } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';

export const activeFields = ['dashboard_title', 'slice_name', 'viz_type', 'datasource_name', 'filter_type', 'targets'];

export const get_dashboard_info_catalog: ISemantics = {
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
  css: {
    business_hint: 'Estilos visuales personalizados del dashboard',
    aliases: ['estilos personalizados'],
  },
  certified_by: {
    business_hint: 'Persona que certificó el dashboard',
    aliases: ['certificador'],
  },
  certification_details: {
    business_hint: 'Detalle de la certificación del dashboard',
    aliases: ['detalle de certificación'],
  },
  published: {
    business_hint: 'Estado de publicación del dashboard',
    aliases: ['estado del dashboard'],
  },
  is_managed_externally: {
    business_hint: 'Indica si el dashboard se administra desde un sistema externo al gestor de paneles',
    aliases: ['gestión externa'],
  },
  external_url: {
    business_hint: 'URL de administración externa del dashboard',
    aliases: ['url externa'],
  },
  url: {
    business_hint: 'Enlace directo al dashboard en el gestor de paneles',
    aliases: ['link', 'enlace'],
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
    business_hint: 'Usuario que creó el dashboard',
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
  owners: {
    business_hint: 'Usuarios propietarios/responsables del dashboard',
    aliases: ['propietarios', 'responsables'],
  },
  tags: {
    business_hint: 'Etiquetas asociadas al dashboard',
    aliases: ['etiquetas'],
  },
  roles: {
    business_hint: 'Roles con acceso restringido explícito al dashboard',
    aliases: ['roles de acceso'],
  },
  native_filters: {
    business_hint: 'Filtros nativos configurados en el dashboard, visibles como controles para el usuario final',
    aliases: ['filtros del dashboard'],
  },
  cross_filters_enabled: {
    business_hint: 'Indica si al hacer clic en un gráfico se filtran automáticamente los demás gráficos del dashboard',
    aliases: ['filtrado cruzado'],
  },
  omitted_fields: {
    business_hint: 'Campos internos de layout que se omiten deliberadamente de la respuesta por ser muy pesados o poco útiles',
    aliases: ['campos omitidos'],
  },
  permalink_key: {
    business_hint: 'Clave de un enlace permanente guardado con un estado específico de filtros',
    aliases: ['clave de enlace permanente'],
  },
  is_permalink_state: {
    business_hint: 'Indica si la respuesta refleja el estado de un enlace permanente en lugar del estado por defecto',
    aliases: ['es enlace permanente'],
  },
  filter_state: {
    business_hint: 'Valores actualmente seleccionados en los filtros del dashboard',
    aliases: ['filtros seleccionados'],
  },
  error: {
    business_hint: 'Mensaje de error de la operación',
    aliases: ['error'],
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
    aliases: ['origen de datos'],
    values: datasource_name,
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
