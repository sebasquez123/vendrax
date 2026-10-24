import { ask, group } from '../../harness/circuit';
import { hasMetric } from '../../harness/checks';

export const GUIDED = group('guided', [
  {
    id: 'guided-1',
    name: 'Guiado · revisar antes de crear, cambiar y quitar',
    dataset: 'VIEW_ACTIVITY_SUPERVISION_LOGS',
    mode: 'guided',
    steps: [
      ask(
        'pedir',
        'Crea un gráfico de barras con Total Dispositivos Involucrados por mes usando DATE_TIME, llámalo "E2E guiado 1" y agrégalo a este dashboard',
        {
          outcome: 'asks',
          expected:
            'No crea nada todavía: como el pedido ya trae todo, muestra la revisión (tipo, datos, eje de fechas mensual, título y dashboard) y pregunta si la acepta.',
        }
      ),
      ask('aceptar', 'Sí, créalo', {
        outcome: 'created',
        changes: { viz_type: 'echarts_timeseries_bar', x_axis: 'DATE_TIME', metrics: hasMetric('Total_Dispositivos_Involucrados') },
        expected: 'Crea el gráfico "E2E guiado 1" como se revisó, lo agrega al dashboard seleccionado y lo confirma.',
      }),
      ask('pedir cambio', 'Pon la leyenda abajo', {
        outcome: 'asks',
        expected: 'No cambia nada todavía: muestra el antes → después de la posición de la leyenda y pregunta si lo aplica.',
      }),
      ask('aceptar cambio', 'Sí, aplícalo', {
        outcome: 'applied',
        changes: { legendOrientation: 'bottom' },
        allowAlso: ['show_legend'],
        expected: 'Pone la leyenda abajo y lo confirma.',
      }),
      ask('pedir quitar', 'Quita este gráfico del dashboard', {
        outcome: 'asks',
        expected: 'No quita nada todavía: dice qué pasará (el gráfico sale del dashboard y sigue existiendo) y pide confirmación.',
      }),
      ask('confirmar', 'Sí, quítalo', {
        outcome: 'removed',
        expected: 'Quita el gráfico del dashboard sin borrarlo y avisa que sigue existiendo.',
      }),
    ],
  },
]);
