import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';
import { datasource_name, datasource_type, slice_names, viz_type } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';

export const activeFields = ['slice_name', 'viz_type', 'datasource_name', 'datasource_type', 'form_data'];

export const get_chart_info_catalog: ISemantics = {
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
  description: {
    business_hint: 'Descripción libre del gráfico',
    aliases: ['descripción'],
  },
  url: {
    business_hint: 'Enlace directo al gráfico en el gestor de paneles',
    aliases: ['link', 'enlace'],
  },
  cache_timeout: {
    business_hint: 'Segundos que se cachea el resultado del gráfico antes de recalcularlo',
    aliases: ['tiempo de caché'],
  },
  created_by: {
    business_hint: 'Usuario que creó el gráfico',
    aliases: ['creador'],
  },
  created_on: {
    business_hint: 'Fecha de creación',
    aliases: ['fecha de alta'],
  },
  created_on_humanized: {
    business_hint: 'Fecha de creación en formato relativo (ej. "hace 2 meses")',
    aliases: ['hace cuánto se creó'],
  },
  changed_by: {
    business_hint: 'Usuario que hizo la última modificación',
    aliases: ['último editor'],
  },
  changed_by_name: {
    business_hint: 'Nombre completo del usuario que hizo la última modificación',
    aliases: ['nombre del último editor'],
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
  form_data: {
    business_hint: 'Configuración completa del gráfico en el formato nativo del gestor de paneles (incluye métrica, agrupación y filtros reales)',
    aliases: ['configuración nativa'],
  },
  form_data_key: {
    business_hint: 'Clave temporal que referencia la configuración cacheada del gráfico',
    aliases: ['clave de configuración'],
  },
  is_unsaved_state: {
    business_hint: 'Indica si hay cambios sin guardar sobre el gráfico',
    aliases: ['cambios sin guardar'],
  },
  owners: {
    business_hint: 'Usuarios propietarios/responsables del gráfico',
    aliases: ['propietarios', 'responsables'],
  },
  tags: {
    business_hint: 'Etiquetas asociadas al gráfico',
    aliases: ['etiquetas'],
  },
  error: {
    business_hint: 'Mensaje de error de la operación',
    aliases: ['error'],
  },
};
