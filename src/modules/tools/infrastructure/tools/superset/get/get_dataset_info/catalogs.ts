import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';
import { dataset_schemas, table_name } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';

export const activeFields = ['table_name', 'schema', 'schema_perm', 'column_name', 'type'];

export const get_dataset_info_catalog: ISemantics = {
  id: {
    business_hint: 'Identificador numérico del dataset',
    aliases: ['id del dataset'],
  },
  database_id: {
    business_hint: 'Identificador de la conexión de base de datos del dataset',
    aliases: ['id de la base de datos'],
  },
  table_name: {
    business_hint: 'Nombre de la tabla o vista de origen',
    aliases: ['nombre de la tabla'],
    values: table_name,
  },
  schema: {
    business_hint: 'Esquema de base de datos donde vive la tabla',
    aliases: ['esquema de base de datos'],
    values: dataset_schemas,
  },
  database_name: {
    business_hint: 'Nombre de la conexión de base de datos',
    aliases: ['base de datos'],
  },
  description: {
    business_hint: 'Descripción libre del dataset',
    aliases: ['descripción'],
  },
  uuid: {
    business_hint: 'Identificador único universal del dataset',
    aliases: ['uuid'],
  },
  main_dttm_col: {
    business_hint: 'Columna de fecha/tiempo principal del dataset',
    aliases: ['columna de fecha principal'],
  },
  is_virtual: {
    business_hint: 'Indica si el dataset se define con una consulta SQL en lugar de apuntar directo a una tabla física',
    aliases: ['dataset virtual', 'consulta guardada'],
  },
  created_on: {
    business_hint: 'Fecha de creación',
    aliases: ['fecha de alta'],
  },
  created_on_humanized: {
    business_hint: 'Fecha de creación en formato relativo (ej. "hace 2 meses")',
    aliases: ['hace cuánto se creó'],
  },
  changed_on: {
    business_hint: 'Fecha de la última modificación',
    aliases: ['última modificación'],
  },
  changed_on_humanized: {
    business_hint: 'Fecha de última modificación en formato relativo',
    aliases: ['hace cuánto se modificó'],
  },
  created_by: {
    business_hint: 'Usuario que creó el dataset',
    aliases: ['creador'],
  },
  changed_by: {
    business_hint: 'Usuario que hizo la última modificación',
    aliases: ['último editor'],
  },
  schema_perm: {
    business_hint: 'Permiso técnico de acceso asociado al esquema del dataset',
    aliases: ['permiso de esquema'],
    values: {
      '[DREMIO].[PAY-SITME]': {
        business_hint: 'Permiso técnico de acceso al esquema PAY-SITME en Dremio',
        aliases: ['permiso al esquema PAY-SITME en DREMIO'],
      },
    },
  },
  offset: {
    business_hint: 'Desfase horario aplicado a las columnas de fecha del dataset',
    aliases: ['desfase horario'],
  },
  cache_timeout: {
    business_hint: 'Segundos que se cachea el resultado del dataset antes de recalcularlo',
    aliases: ['tiempo de caché'],
  },
  is_favorite: {
    business_hint: 'Indica si el usuario actual marcó el dataset como favorito',
    aliases: ['favorito'],
  },
  tags: {
    business_hint: 'Etiquetas asociadas al dataset',
    aliases: ['etiquetas'],
  },
  owners: {
    business_hint: 'Usuarios propietarios/responsables del dataset',
    aliases: ['propietarios', 'responsables'],
  },
  sql: {
    business_hint: 'Consulta SQL que define el dataset (solo si es virtual)',
    aliases: ['consulta sql'],
  },
  params: {
    business_hint: 'Parámetros internos de configuración del dataset',
    aliases: ['parámetros'],
  },
  template_params: {
    business_hint: 'Parámetros de plantilla usados dentro del SQL del dataset',
    aliases: ['parámetros de plantilla'],
  },
  extra: {
    business_hint: 'Configuración adicional del dataset',
    aliases: ['configuración extra'],
  },
  url: {
    business_hint: 'Enlace directo al dataset en el gestor de paneles',
    aliases: ['link', 'enlace'],
  },
  columns: {
    business_hint: 'Columnas disponibles en el dataset',
    aliases: ['columnas'],
  },
  metrics: {
    business_hint: 'Métricas guardadas y disponibles para construir gráficos',
    aliases: ['métricas'],
  },
  error: {
    business_hint: 'Mensaje de error de la operación',
    aliases: ['error'],
  },
  column_name: {
    business_hint: 'Nombre técnico de la columna',
    aliases: ['nombre técnico de columna'],
    values: {},
  },
  verbose_name: {
    business_hint: 'Nombre visible de la columna o métrica para el usuario final',
    aliases: ['nombre para mostrar'],
  },
  type: {
    business_hint: 'Tipo de dato de la columna',
    aliases: ['tipo de dato'],
    values: {
      VARCHAR: { business_hint: 'Columna de texto', aliases: ['texto'] },
      BIGINT: { business_hint: 'Columna numérica entera', aliases: ['número entero'] },
      INTEGER: { business_hint: 'Columna numérica entera', aliases: ['número entero'] },
      FLOAT: { business_hint: 'Columna numérica decimal', aliases: ['número decimal'] },
      TIMESTAMP: { business_hint: 'Columna de fecha y hora', aliases: ['fecha y hora'] },
      DATE: { business_hint: 'Columna de fecha', aliases: ['fecha'] },
      TIME: { business_hint: 'Columna de hora', aliases: ['hora'] },
    },
  },
  is_dttm: {
    business_hint: 'Indica si la columna es de tipo fecha/hora',
    aliases: ['columna de fecha'],
  },
  groupby: {
    business_hint: 'Indica si la columna se puede usar para agrupar/desglosar datos',
    aliases: ['agrupable'],
  },
  filterable: {
    business_hint: 'Indica si la columna se puede usar como filtro',
    aliases: ['filtrable'],
  },
  metric_name: {
    business_hint: 'Nombre técnico de la métrica guardada',
    aliases: ['nombre técnico de métrica'],
  },
  expression: {
    business_hint: 'Fórmula SQL que calcula la métrica',
    aliases: ['fórmula sql'],
  },
  d3format: {
    business_hint: 'Formato numérico con el que se muestra la métrica (ej. moneda, porcentaje)',
    aliases: ['formato numérico'],
  },
};
