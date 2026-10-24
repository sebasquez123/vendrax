import { ask, group } from '../../harness/circuit';
import { matching, metric } from '../../harness/checks';

export const FUNNEL = group('funnel', [
  {
    id: 'funnel-1',
    name: 'Embudo · etiquetas, porcentajes, etapas y métrica',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    base: 'funnel',
    steps: [
      ask('etiquetas', 'En el embudo, muestra el nombre y el porcentaje en las etapas', {
        outcome: 'applied',
        changes: { label_type: 4 },
        allowAlso: ['show_labels'],
        expected: 'Cambia las etiquetas de las etapas a nombre y porcentaje, y lo confirma.',
      }),
      ask('porcentaje', 'Que el porcentaje sea respecto a la etapa anterior', {
        outcome: 'applied',
        changes: { percent_calculation_type: 'prev_step' },
        expected: 'Calcula el porcentaje de cada etapa respecto a la anterior y lo confirma.',
      }),
      ask('leyenda y formato', 'Pon la leyenda abajo y los números con dos decimales', {
        outcome: 'applied',
        changes: { legendOrientation: 'bottom', number_format: matching(/\.2f$/, 'un formato con dos decimales (….2f)') },
        allowAlso: ['show_legend'],
        expected: 'Mueve la leyenda abajo y pone los números con dos decimales, y confirma los dos cambios.',
      }),
      ask('etapas', 'Muestra solo las 3 etapas más grandes', {
        outcome: 'applied',
        changes: { row_limit: 3, sort_by_metric: true },
        expected: 'Limita el embudo a las 3 etapas de mayor valor y lo confirma.',
      }),
      ask('métrica', 'Que mida Total ventas', {
        outcome: 'applied',
        changes: { metric: metric('Total ventas') },
        expected: 'Cambia la métrica del embudo a Total ventas, conserva el resto y lo confirma.',
      }),
    ],
  },
]);
