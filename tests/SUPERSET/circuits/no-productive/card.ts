import { ask, group } from '../../harness/circuit';
import { anyTimeRange, columns, hasMetric, matching } from '../../harness/checks';

export const CARD = group('card', [
  {
    id: 'card-1',
    name: 'Tarjeta personalizada · estilos y fila por fila',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    steps: [
      ask('crear', 'Crea una tarjeta personalizada que liste Total cuentas por PAYMENT_METHOD, llámala "E2E tarjeta 1" y agrégala a este dashboard', {
        outcome: 'created',
        changes: { viz_type: 'handlebars', groupby: columns('PAYMENT_METHOD'), metrics: hasMetric('Total cuentas') },
        expected:
          'Crea la tarjeta personalizada "E2E tarjeta 1" con Total cuentas por PAYMENT_METHOD, la agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
      }),
      ask('estilos', 'Cambia los estilos para que el texto se vea en azul', {
        outcome: 'applied',
        changes: { styleTemplate: matching(/color\s*:/i, 'un CSS que fija el color') },
        expected: 'Cambia el CSS de la tarjeta para que el texto se vea azul, sin tocar la plantilla, y lo confirma.',
      }),
      ask('plantilla', 'Cambia la plantilla para que el nombre de cada PAYMENT_METHOD salga en negrita', {
        outcome: 'applied',
        changes: { handlebarsTemplate: matching(/<(b|strong)\b|font-weight/i, 'una plantilla con negrita') },
        allowAlso: ['handlebars_template'],
        expected: 'Cambia la plantilla HTML para que PAYMENT_METHOD se vea en negrita, sin tocar los estilos ni los datos, y lo confirma.',
      }),
      ask('filtro y límite', 'Que muestre solo los últimos 30 días y máximo 5 filas', {
        outcome: 'applied',
        changes: { adhoc_filters: anyTimeRange(), row_limit: 5 },
        allowAlso: ['time_range'],
        expected: 'Filtra la tarjeta a los últimos 30 días por una de sus fechas (y dice cuál) y la limita a 5 filas, y confirma los dos cambios.',
      }),
      ask('fila por fila', 'Que muestre cada registro con DATE_TIME y PAYMENT_METHOD', {
        outcome: 'applied',
        changes: { query_mode: 'raw', all_columns: columns('DATE_TIME', 'PAYMENT_METHOD') },
        allowAlso: ['groupby', 'metrics', 'order_desc', 'handlebarsTemplate', 'handlebars_template'],
        expected:
          'Pasa la tarjeta a un registro por fila con DATE_TIME y PAYMENT_METHOD; si la plantilla mostraba la métrica, la ajusta a las nuevas columnas o lo advierte; y lo confirma.',
      }),
      ask('eliminar', 'Bórrala definitivamente', {
        outcome: 'deleted',
        expected: 'Borra la tarjeta de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
]);
