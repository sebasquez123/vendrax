import type { Glossary } from '../../types';
import type { ChartType } from '~/modules/tools/infrastructure/tools/superset/shared/schemas/chart_config.schema';

export const table_name: Glossary = {
  ACCOUNT_MOVEMENTS_VIEW: {
    business_hint: 'Movimientos de cuentas de SITME (recaudos, validaciones, ventas)',
    aliases: ['movimientos de cuentas de sitme (recaudos, validaciones, ventas)'],
  },
  VIEW_CONTRACT_BALANCE_HISTORY: {
    business_hint: 'Historial de saldo de beneficios por contrato de SITME',
    aliases: ['historial de saldo de beneficios por contrato de sitme'],
  },
  VIEW_ACTIVITY_SUPERVISION_LOGS: {
    business_hint: 'Registro de actividad y supervisión de SITME',
    aliases: ['registro de actividad y supervisión de sitme'],
  },
};

export const dataset_schemas: Glossary = {
  'PAY-SITME': { business_hint: 'Esquema del módulo SITME de PAY', aliases: ['esquema del módulo sitme de pay', 'el esquema de BD SITME'] },
};

export const dataset_columns_movements: Glossary = {
  ACCOUNT: { business_hint: 'Cuenta del usuario o cliente', aliases: ['cuenta'] },
  ACCOUNT_ID: { business_hint: 'Identificador de la cuenta', aliases: ['id cuenta'] },
  CONTRACT_ID: { business_hint: 'Identificador del contrato', aliases: ['id contrato'] },
  CONTRACT_TYPE: { business_hint: 'Tipo de contrato', aliases: ['tipo de contrato'] },
  DATE: { business_hint: 'Fecha del movimiento', aliases: ['fecha'] },
  DATE_TIME: { business_hint: 'Fecha y hora del movimiento', aliases: ['fecha'] },
  DETAIL: { business_hint: 'Detalle numérico del movimiento', aliases: ['detalle'] },
  DETAIL_DESC: { business_hint: 'Descripción detallada del movimiento', aliases: ['descripción detallada'] },
  DEVICE: { business_hint: 'Dispositivo usado en el movimiento', aliases: ['dispositivo'] },
  'ENTE GESTOR': { business_hint: 'Ente gestor responsable', aliases: ['ente gestor'] },
  HORA: { business_hint: 'Hora del movimiento', aliases: ['hora'] },
  IS_ACTIVE: { business_hint: 'Indica si el registro está activo', aliases: ['activo'] },
  MEDIO_VALIDACION: { business_hint: 'Medio usado para la validación', aliases: ['medio de validación', 'tipo de validacion', 'metodo de pago'] },
  MOVEMENT_CATEGORY_DESC: { business_hint: 'Categoría del movimiento (recarga, venta, validación, etc.)', aliases: ['movimiento'] },
  MOVEMENT_TYPE_DESC: { business_hint: 'Tipo de movimiento', aliases: ['tipo de movimiento'] },
  NEW_BALANCE_VALUE: { business_hint: 'Nuevo valor del saldo después del movimiento', aliases: ['nuevo valor de saldo'] },
  'OPERADOR FLOTA': { business_hint: 'Operador de flota del movimiento', aliases: ['operador de flota'] },
  'OPERADOR RECAUDO': { business_hint: 'Operador de recaudo del movimiento', aliases: ['operador de recaudo'] },
  'OPERDOR TECNOLOGICO': { business_hint: 'Operador tecnológico del movimiento', aliases: ['operador tecnológico'] },
  PAYMENT_METHOD: { business_hint: 'Método de pago usado', aliases: ['metodo pago'] },
  PERSON_PROFILE: { business_hint: 'Perfil de la persona', aliases: ['perfil'] },
  PLACA: { business_hint: 'Placa del vehículo', aliases: ['placa'] },
  PLACE: { business_hint: 'Ubicación donde ocurrió el movimiento', aliases: ['ubicación'] },
  PREVIOUS_BALANCE_VALUE: { business_hint: 'Valor del saldo antes del movimiento', aliases: ['saldo anterior'] },
  PRODUCT_NAME: { business_hint: 'Nombre del producto', aliases: ['producto'] },
  RUTA: { business_hint: 'Ruta del vehículo', aliases: ['ruta'] },
  SELLER: { business_hint: 'Vendedor asociado al movimiento', aliases: ['vendedor'] },
  STATUS_DESC: { business_hint: 'Estado del movimiento', aliases: ['estado'] },
  VALUE_MONEY: { business_hint: 'Valor en dinero del movimiento', aliases: ['valor dinero'] },
  VALUE_UNIT: { business_hint: 'Unidad de valor del movimiento', aliases: ['unidad de valor'] },
  VEHICULO: { business_hint: 'Vehículo asociado al movimiento', aliases: ['vehículo'] },
};

export const dataset_columns_history: Glossary = {
  'Beneficio Asignado': { business_hint: 'Beneficio asignado al contrato', aliases: ['beneficio asignado'] },
  CONTRACT_ID: { business_hint: 'Identificador del contrato', aliases: ['id contrato'] },
  CONTRAC_NAME: { business_hint: 'Nombre del contrato', aliases: ['contrato'] },
  DATE_TIME: { business_hint: 'Fecha y hora del registro', aliases: ['fecha'] },
  LIMIT_MAX_DAY: { business_hint: 'Límite máximo diario del beneficio', aliases: ['límite diario'] },
  LIMIT_MAX_MONTH: { business_hint: 'Límite máximo mensual del beneficio', aliases: ['límite mensual'] },
  LIMIT_MAX_WEEK: { business_hint: 'Límite máximo semanal del beneficio', aliases: ['límite semanal'] },
  PERIOD_START_DATE: { business_hint: 'Fecha de inicio del período', aliases: ['inicio del período'] },
  PERSON_NAME: { business_hint: 'Nombre de la persona', aliases: ['nombre'] },
  PERSON_NUMBER: { business_hint: 'Número de identificación de la persona', aliases: ['identificación'] },
  PERSON_PROFILE: { business_hint: 'Perfil de la persona', aliases: ['perfil'] },
  REMAINING_USAGE: { business_hint: 'Beneficio no usado restante', aliases: ['beneficio no usado'] },
  TOTAL_USAGE: { business_hint: 'Beneficio usado', aliases: ['beneficio usado'] },
};

export const dataset_columns_supervision_logs: Glossary = {
  COMPANY_MANE: { business_hint: 'Nombre de la empresa', aliases: ['nombre de la empresa'] },
  CONTRACT_ID: { business_hint: 'Identificador del contrato', aliases: ['id contrato'] },
  DATE_TIME: { business_hint: 'Fecha y hora del registro', aliases: ['fecha'] },
  LATITUDE: { business_hint: 'Latitud de la ubicación', aliases: ['latitud'] },
  LONGITUDE: { business_hint: 'Longitud de la ubicación', aliases: ['longitud'] },
  NAME_DEVICE: { business_hint: 'Nombre del dispositivo', aliases: ['nombre del dispositivo'] },
  NAME_PERSON: { business_hint: 'Nombre de la persona', aliases: ['nombre'] },
  NAME_PERSON_PROFILE: { business_hint: 'Perfil de la persona', aliases: ['perfil'] },
  ROUTE_NAME: { business_hint: 'Nombre de la ruta', aliases: ['ruta'] },
  SITIO: { business_hint: 'Sitio donde ocurrió la actividad', aliases: ['sitio'] },
  TYPE: { business_hint: 'Tipo de validación (Online u Offline)', aliases: ['tipo de validación'] },
  VALIDATION_METHOD: { business_hint: 'Método de validación usado', aliases: ['método de validación'] },
  VEHICLE_CODE: { business_hint: 'Código del vehículo', aliases: ['código de vehículo'] },
};

export const DATASET_COLUMN_GLOSSARIES: Record<string, Glossary> = {
  ACCOUNT_MOVEMENTS_VIEW: dataset_columns_movements,
  VIEW_CONTRACT_BALANCE_HISTORY: dataset_columns_history,
  VIEW_ACTIVITY_SUPERVISION_LOGS: dataset_columns_supervision_logs,
};

export const slice_names: Glossary = {
  GF_PAY_SITME_TOTAL_DISPOSITIVOS: { business_hint: 'Total de dispositivos', aliases: ['total de dispositivos'] },
  GF_PAY_SITME_RECAUDO_TOTAL_X_DIA: { business_hint: 'Recaudo total por día', aliases: ['recaudo total por día'] },
  PAY_SITME_TABLA: { business_hint: 'Tabla general de movimientos', aliases: ['tabla general de movimientos'] },
  GF_PAY_SITME_TOTAL_CUENTAS: { business_hint: 'Total de cuentas', aliases: ['total de cuentas'] },
  GF_PAY_SITME_TOTAL_VENDEDORES: { business_hint: 'Total de vendedores', aliases: ['total de vendedores'] },
  GF_PAY_TOTAL_DINERO: { business_hint: 'Total de dinero', aliases: ['total de dinero'] },
  GF_PAY_SITME_TOTAL_RECAUDO_X_VALIDA: { business_hint: 'Total de recaudo por validación', aliases: ['total de recaudo por validación'] },
  GF_PAY_SITME_TOTAL_RECAGAS_X_DIA: { business_hint: 'Total de recargas por día', aliases: ['total de recargas por día'] },
  GF_PAY_SITME_VALI_X_DIA: { business_hint: 'Validaciones por día', aliases: ['validaciones por día'] },
  GF_PAY_SITME_VALI_X_HORA: { business_hint: 'Validaciones por hora', aliases: ['validaciones por hora'] },
  GF_PAY_SITME_TOTAL_VALIDACIONES: { business_hint: 'Total de validaciones', aliases: ['total de validaciones'] },
  GF_PAY_SITME_TOTAL_RECAUDO_X_VALIDACIONES: {
    business_hint: 'Total de recaudo por validaciones',
    aliases: ['total de recaudo por validaciones'],
  },
  GF_PAY_SITME_TOTAL_DINERO_X_VENTAS: { business_hint: 'Total de dinero por ventas', aliases: ['total de dinero por ventas'] },
  GF_PAY_SITME_TOTAL_VENTAS_X_DIA: { business_hint: 'Total de ventas por día', aliases: ['total de ventas por día'] },
  TABLA_VALIDACIONES: { business_hint: 'Tabla de validaciones', aliases: ['tabla de validaciones'] },
  GF_VOA_SITME_TOTAL_VENTAS: { business_hint: 'Total de ventas (VOA)', aliases: ['total de ventas (voa)'] },
  GF_PAY_SITME_TOP_VENTAS_POR_LUGAR: { business_hint: 'Top de ventas por lugar', aliases: ['top de ventas por lugar'] },
  TABLA_VENTAS: { business_hint: 'Tabla de ventas', aliases: ['tabla de ventas'] },
  GF_PAY__PANEL_GENERAL_SITME_TOTAL_VALIDACIONES: {
    business_hint: 'Total de validaciones (panel general)',
    aliases: ['total de validaciones (panel general)'],
  },
  GF_PAY__PANEL_GENERAL_SITME_TOTAL_DINERO_X_VENTAS: {
    business_hint: 'Total de dinero por ventas (panel general)',
    aliases: ['total de dinero por ventas (panel general)'],
  },
  GF_PAY_SITME_PANEL_GENERAL_TRANS_X_HORA: {
    business_hint: 'Transacciones por hora (panel general)',
    aliases: ['transacciones por hora (panel general)'],
  },
  GF_PAY_SITME_PANEL_GENERAL_VALIDACI_X_HORA: {
    business_hint: 'Validaciones por hora (panel general)',
    aliases: ['validaciones por hora (panel general)'],
  },
  GF_PAY_SITME_PANEL_GENERAL_TOTAL_VENTAS_X_HORA: {
    business_hint: 'Total de ventas por hora (panel general)',
    aliases: ['total de ventas por hora (panel general)'],
  },
  GF_PAY_SITME_MAYOR_VENDEDOR_X_VENTAS: { business_hint: 'Mayor vendedor por ventas', aliases: ['mayor vendedor por ventas'] },
  GF_PAY_SITME_TOTAL_REMBOLSO_VENTAS: { business_hint: 'Total de reembolsos de ventas', aliases: ['total de reembolsos de ventas'] },
  GF_PAY_SITME_RECAUDO_X_VALIDACIONES: { business_hint: 'Recaudo por validaciones', aliases: ['recaudo por validaciones'] },
  GF_PAY_SITME_TOTAL_VENTAS: { business_hint: 'Total de ventas', aliases: ['total de ventas'] },
  GF_PAY_SITME_TOTAL_TRASACCIONES: { business_hint: 'Total de transacciones', aliases: ['total de transacciones'] },
  GF_PAY_SITME_TOTAL_UBICACIONES: { business_hint: 'Total de ubicaciones', aliases: ['total de ubicaciones'] },
  GF_PAY_SITME_TOTA_TRANS_X_DIA: { business_hint: 'Total de transacciones por día', aliases: ['total de transacciones por día'] },
  GF_PAY_SITME_TOP_VALI_X_HORA: { business_hint: 'Top de validaciones por hora', aliases: ['top de validaciones por hora'] },
  GF_PAY_SITME_TOP_VENTAS_X_HORA: { business_hint: 'Top de ventas por hora', aliases: ['top de ventas por hora'] },
  GF_PAY_SITME_VALI_X_MEDIO: { business_hint: 'Validaciones por medio', aliases: ['validaciones por medio'] },
  PAY_SITME_total_usuarios_uso: { business_hint: 'Total de usuarios con uso', aliases: ['total de usuarios con uso'] },
  PAY_SITME_total_usuarios_uso_x_perfil: {
    business_hint: 'Total de usuarios con uso por perfil',
    aliases: ['total de usuarios con uso por perfil'],
  },
  PAY_SITME_total_uso: { business_hint: 'Total de uso', aliases: ['total de uso'] },
  PAY_SITME_tabla_detalle: { business_hint: 'Tabla de detalle', aliases: ['tabla de detalle'] },
  PAY_SITME_total_beneficio_asignado: { business_hint: 'Total de beneficio asignado', aliases: ['total de beneficio asignado'] },
  PAY_SITME_total_beneficio_usado: { business_hint: 'Total de beneficio usado', aliases: ['total de beneficio usado'] },
  PAY_SITME_total_beneficio_no_usado: { business_hint: 'Total de beneficio no usado', aliases: ['total de beneficio no usado'] },
  'PAY_SITME_%_uso_beneficios': { business_hint: 'Porcentaje de uso de beneficios', aliases: ['porcentaje de uso de beneficios'] },
  PAY_SITME_uso_total_por_perfil: { business_hint: 'Uso total por perfil', aliases: ['uso total por perfil'] },
  PAY_SITME_top10_usuarios_por_uso: { business_hint: 'Top 10 usuarios por uso', aliases: ['top 10 usuarios por uso'] },
  GF_PAY_SITME_TOTAL_VENTAS_X_METODO_PAGO: {
    business_hint: 'Total de ventas por método de pago',
    aliases: ['total de ventas por método de pago'],
  },
};

export const viz_type: Glossary = {
  big_number_total: { business_hint: 'Número grande con el total agregado', aliases: ['número total', 'indicador total'] },
  big_number: { business_hint: 'Número grande (KPI simple)', aliases: ['número grande', 'indicador'] },
  echarts_timeseries_bar: { business_hint: 'Gráfico de barras en el tiempo', aliases: ['gráfico de barras', 'barras'] },
  echarts_area: { business_hint: 'Gráfico de área en el tiempo', aliases: ['gráfico de área', 'área'] },
  pie: { business_hint: 'Gráfico circular (torta o dona)', aliases: ['torta', 'pastel', 'circular'] },
  table: { business_hint: 'Tabla de datos', aliases: ['tabla'] },
  heatmap_v2: { business_hint: 'Mapa de calor', aliases: ['mapa de calor'] },
  cal_heatmap: { business_hint: 'Mapa de calor tipo calendario', aliases: ['calendario de calor'] },
  deck_heatmap: { business_hint: 'Mapa de calor geográfico', aliases: ['mapa de calor geográfico'] },
};

export const datasource_name: Glossary = {
  'PAY-SITME.ACCOUNT_MOVEMENTS_VIEW': {
    business_hint: 'Base de datos de Movimientos de cuentas de SITME (recaudos, validaciones, ventas)',
    aliases: ['movimientos de cuentas de sitme (recaudos, validaciones, ventas)', 'base de datos de validaciones', 'Db de validaciones'],
  },
  'PAY-SITME.VIEW_CONTRACT_BALANCE_HISTORY': {
    business_hint: 'Historial de saldo de beneficios por contrato de SITME',
    aliases: [
      'historial de saldo de beneficios por contrato de sitme',
      'Base de datos de contratos y balance',
      'Db de hisotria, contratos y balance',
    ],
  },
  'PAY-SITME.VIEW_ACTIVITY_SUPERVISION_LOGS': {
    business_hint: 'Logs de nivel tecnico (detalles de actividad y supervisión de transacciones SITME)',
    aliases: ['registro de actividad y supervisión de sitme', 'logs de transacciones SITME'],
  },
};

export const dashboard_title: Glossary = {
  PAY: { business_hint: 'Panel hechos para Pay Mx', aliases: ['panel general de pay mx', 'dashboard de pay mexico'] },
  'PAY - SITME': { business_hint: 'Paneles hechos para SITME', aliases: ['panel de sitme', 'dashboard creado con SITME'] },
  METBOT: { business_hint: 'Panel hecho con Agente Metbot', aliases: ['panel hecho con metbot', 'dashboard creado con metbot'] },
};

export const filter_type: Glossary = {
  filter_select: {
    business_hint: 'Filtro de selección de valores en una lista desplegable',
    aliases: ['filtro de selección', 'lista desplegable'],
  },
  filter_time: { business_hint: 'Filtro de rango de fechas', aliases: ['filtro de fecha', 'rango de fechas'] },
};

export const datasource_type: Glossary = {
  table: { business_hint: 'La fuente es una tabla física de la base de datos', aliases: ['tabla física'] },
};

export const chart_type: Glossary = {
  xy: {
    business_hint: 'Gráfico de línea, barras, área o dispersión sobre dos ejes',
    aliases: ['línea', 'barras', 'área', 'dispersión', 'line', 'bar', 'area', 'scatter'],
  },
  table: { business_hint: 'Tabla de datos', aliases: ['tabla'] },
  pie: { business_hint: 'Gráfico circular (torta o dona)', aliases: ['torta', 'pastel', 'circular'] },
  big_number: { business_hint: 'Indicador numérico grande (KPI)', aliases: ['número grande', 'indicador', 'KPI'] },
  handlebars: { business_hint: 'Tarjeta o reporte con plantilla HTML personalizada', aliases: ['plantilla personalizada', 'reporte HTML'] },
  pivot_table: {
    business_hint: 'Tabla dinámica de cruce de datos (no se construye desde aquí; sus opciones guardadas sí se cambian)',
    aliases: ['tabla dinámica', 'tabla pivote'],
  },
  mixed_timeseries: {
    business_hint: 'Serie de tiempo que combina dos tipos de gráfico (no se construye desde aquí; sus opciones guardadas sí se cambian)',
    aliases: ['serie de tiempo mixta'],
  },
};

export const CHART_TYPE_FIELDS: Record<ChartType, string> = {
  xy: 'an x axis (usually a date/time column) and at least one metric, optionally a series breakdown',
  pie: 'one dimension and one metric',
  big_number: 'one metric, plus a date/time column only if the user asked for a trendline',
  table: 'the columns to show',
  handlebars: 'a template plus its metrics or columns',
};

export const describeChartTypeFields = (): string =>
  Object.entries(CHART_TYPE_FIELDS)
    .map(([type, fields]) => `${type} → ${fields}`)
    .join('; ');
