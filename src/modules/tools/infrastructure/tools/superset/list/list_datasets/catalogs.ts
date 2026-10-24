import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';
import { dataset_schemas, table_name } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';

export const activeFields = ['table_name', 'schema'];

export const list_datasets_catalog: ISemantics = {
  count: {
    business_hint: 'Cantidad de datasets devueltos en esta página',
    aliases: ['cantidad en esta página'],
  },
  total_count: {
    business_hint: 'Cantidad total de datasets que cumplen la búsqueda',
    aliases: ['total de datasets'],
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
  datasets: {
    business_hint: 'Lista de datasets encontrados',
    aliases: ['lista de datasets encontrados'],
  },
  error: {
    business_hint: 'Mensaje de error de la operación',
    aliases: ['error'],
  },
  id: {
    business_hint: 'Identificador numérico del dataset',
    aliases: ['id del dataset'],
  },
  uuid: {
    business_hint: 'Identificador único universal del dataset',
    aliases: ['uuid'],
  },
  table_name: {
    business_hint: 'Nombre de la tabla o vista de origen',
    aliases: ['nombre de la tabla'],
    values: table_name,
  },
  database_id: {
    business_hint: 'Identificador de la conexión de base de datos del dataset',
    aliases: ['id de la base de datos'],
  },
  database_name: {
    business_hint: 'Nombre de la conexión de base de datos',
    aliases: ['base de datos'],
  },
  description: {
    business_hint: 'Descripción libre del dataset',
    aliases: ['descripción'],
  },
  certified_by: {
    business_hint: 'Persona que certificó el dataset',
    aliases: ['certificador'],
  },
  certification_details: {
    business_hint: 'Detalle de la certificación del dataset',
    aliases: ['detalle de certificación'],
  },
  changed_on: {
    business_hint: 'Fecha de la última modificación',
    aliases: ['última modificación'],
  },
  changed_on_humanized: {
    business_hint: 'Fecha de última modificación en formato relativo',
    aliases: ['hace cuánto se modificó'],
  },
  schema: {
    business_hint: 'Esquema de base de datos donde vive la tabla',
    aliases: ['esquema de base de datos'],
    values: dataset_schemas,
  },
  url: {
    business_hint: 'Enlace directo al dataset en el gestor de paneles',
    aliases: ['link', 'enlace'],
  },
};
