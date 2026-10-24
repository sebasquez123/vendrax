import type { ISemantics } from '~/modules/tools/infrastructure/tools/superset/shared/interfaces/semantics';
import { chart_type } from '~/knowledge/SUPERSET/04_tool_glossary/04_tool_glossary';

export const activeFields = ['chart_type'];

export const get_chart_type_schema_catalog: ISemantics = {
  chart_type: {
    business_hint: 'Tipo de gráfico a construir',
    aliases: ['tipo de gráfico', 'tipo de chart'],
    values: chart_type,
  },
  schema: {
    business_hint: 'Definición de los campos válidos para ese tipo de gráfico',
    aliases: ['esquema de gráfico'],
  },
  examples: {
    business_hint: 'Ejemplos de configuración válida para ese tipo de gráfico',
    aliases: ['ejemplos'],
  },
};
