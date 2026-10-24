import { ask, group } from '../../harness/circuit';
import { hasMetric } from '../../harness/checks';

const CANNOT = 'No cambia nada: dice con claridad que no se puede hacer desde aquí';

export const LIMITS = group('limits', [
  {
    id: 'limits-1',
    name: 'Límites · lo que no se puede hacer',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    steps: [
      ask('crear', 'Crea un gráfico de barras con Total rembolso por mes usando DATE, llámalo "E2E límites 1" y agrégalo a este dashboard', {
        outcome: 'created',
        changes: { viz_type: 'echarts_timeseries_bar', x_axis: 'DATE', metrics: hasMetric('Total rembolso') },
        expected:
          'Crea el gráfico de barras "E2E límites 1" con Total rembolso por mes de DATE, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
      }),
      ask('fuente de datos', 'Cambia la fuente de datos de este gráfico a VIEW_CONTRACT_BALANCE_HISTORY', {
        outcome: 'judged',
        expected:
          'Crea un gráfico equivalente con la fuente nueva diciendo qué métricas y columnas asumió como equivalentes, o explica que un gráfico no cambia de fuente y ofrece uno nuevo. Nunca borra para siempre el original.',
      }),
      ask('fórmula SQL', 'Agrega una métrica con esta fórmula SQL: SUM(VALUE_MONEY) / COUNT(*)', {
        outcome: 'not_applied',
        expected: `${CANNOT}: las métricas con fórmula SQL no se crean desde el chat; ofrece usar una métrica guardada del dataset.`,
      }),
      ask('comparación', 'Compáralo con el mismo periodo del año anterior', {
        outcome: 'not_applied',
        expected: `${CANNOT}: la comparación de periodos se configura en el gestor de paneles.`,
      }),
      ask('tamaño de letra', 'Agranda la letra de las etiquetas del eje X', {
        outcome: 'not_applied',
        expected: `${CANNOT}: el tamaño de la letra no se cambia; ofrece lo más cercano que sí (por ejemplo, girar las etiquetas), sin aplicarlo.`,
      }),
      ask('tabla dinámica', 'Conviértelo en una tabla dinámica', {
        outcome: 'not_applied',
        expected: `${CANNOT}: las tablas dinámicas no se pueden crear ni convertir desde aquí; ofrece los tipos que sí (por ejemplo, una tabla).`,
      }),
      ask('dueños', 'Agrega al usuario ANALISTA_QA como dueño de este gráfico', {
        outcome: 'not_applied',
        expected: `${CANNOT}: los dueños de un gráfico se administran en el gestor de paneles.`,
      }),
      ask('posición', 'Hazlo más ancho en el dashboard', {
        outcome: 'not_applied',
        expected: `${CANNOT}: la posición y el tamaño en el dashboard se cambian en el gestor de paneles.`,
      }),
      ask('reporte programado', 'Envíame este gráfico por correo todos los lunes', {
        outcome: 'not_applied',
        expected: `${CANNOT}: los envíos programados se configuran en el gestor de paneles.`,
      }),
      ask('eliminar', 'Bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
]);
