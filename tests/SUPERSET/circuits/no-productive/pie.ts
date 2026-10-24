import { ask, breakChart, group } from '../../harness/circuit';
import { above, below, columns, matching, metric, oneOf } from '../../harness/checks';

export const PIE = group('pie', [
  {
    id: 'pie-1',
    name: 'Circular · dona, etiquetas y leyenda',
    dataset: 'VIEW_ACTIVITY_SUPERVISION_LOGS',
    steps: [
      ask(
        'crear',
        'Crea un gráfico circular de Total Validaciones Offline por VALIDATION_METHOD, llámalo "E2E circular 1" y agrégalo a este dashboard',
        {
          outcome: 'created',
          changes: { viz_type: 'pie', groupby: columns('VALIDATION_METHOD'), metric: metric('Total_Validaciones_Offline') },
          expected:
            'Crea el gráfico circular "E2E circular 1" con Total Validaciones Offline por VALIDATION_METHOD, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
        }
      ),
      ask('dona', 'Hazla dona y agranda el hueco', {
        outcome: 'applied',
        changes: { donut: true, innerRadius: above(30) },
        expected: 'Convierte el gráfico en dona con un hueco mayor que el de por defecto (30) y confirma los dos cambios.',
      }),
      ask('etiquetas', 'Muestra los porcentajes en las porciones', {
        outcome: 'applied',
        changes: { label_type: oneOf('percent', 'key_percent', 'value_percent', 'key_value_percent') },
        allowAlso: ['show_labels'],
        expected: 'Cambia las etiquetas de las porciones para que muestren el porcentaje y lo confirma.',
      }),
      breakChart('estropear', { show_labels: false }),
      ask('arreglar', 'Ya no se ven las etiquetas de las porciones, ¿las puedes volver a mostrar?', {
        outcome: 'applied',
        changes: { show_labels: true },
        expected: 'Vuelve a mostrar las etiquetas de las porciones, con el porcentaje que tenían, y lo confirma.',
      }),
      breakChart('ocultar leyenda', { show_legend: false }),
      ask('leyenda', 'Pon la leyenda abajo', {
        outcome: 'applied',
        changes: { show_legend: true, legendOrientation: 'bottom' },
        expected: 'Muestra la leyenda, que estaba oculta, y la pone abajo; dice que también tuvo que mostrarla.',
      }),
      ask('no disponible', 'Pinta de verde solo la porción más grande', {
        outcome: 'not_applied',
        expected:
          'No cambia nada: explica que el color de una sola porción no se puede cambiar desde aquí y ofrece cambiar la paleta completa, sin aplicarlo.',
      }),
      ask('quitar', 'Quita este gráfico del dashboard', {
        outcome: 'removed',
        expected:
          'Quita el gráfico del dashboard sin borrarlo y avisa que el gráfico sigue existiendo y que se puede borrar para siempre si se quiere.',
      }),
    ],
  },
  {
    id: 'pie-2',
    name: 'Circular · etiquetas, límites y métrica',
    dataset: 'VIEW_CONTRACT_BALANCE_HISTORY',
    steps: [
      ask('crear', 'Crea un gráfico circular de Total No Usado por PERSON_PROFILE, llámalo "E2E circular 2" y agrégalo a este dashboard', {
        outcome: 'created',
        changes: { viz_type: 'pie', groupby: columns('PERSON_PROFILE'), metric: metric('total_uso_remanente') },
        expected:
          'Crea el gráfico circular "E2E circular 2" con Total No Usado por PERSON_PROFILE, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
      }),
      ask('etiquetas', 'Pon las etiquetas por fuera, con líneas, mostrando el nombre y el porcentaje', {
        outcome: 'applied',
        changes: { labels_outside: true, label_line: true, label_type: 'key_percent' },
        allowAlso: ['show_labels'],
        expected: 'Deja las etiquetas por fuera con líneas y con nombre y porcentaje, y confirma los cambios.',
      }),
      ask('umbral y total', 'Oculta las etiquetas de las porciones menores al 10 % y muestra el total', {
        outcome: 'applied',
        changes: { show_labels_threshold: 10, show_total: true },
        expected: 'Oculta las etiquetas de las porciones por debajo del 10 % y muestra el total, y confirma los dos cambios.',
      }),
      ask('las más grandes', 'Muestra solo las 5 porciones más grandes', {
        outcome: 'applied',
        changes: { row_limit: 5, sort_by_metric: true },
        expected: 'Limita el gráfico a 5 porciones ordenadas por valor (las más grandes) y lo confirma.',
      }),
      ask('formato y tamaño', 'Números con dos decimales y hazla más pequeña', {
        outcome: 'applied',
        changes: { number_format: matching(/\.2f$/, 'un formato con dos decimales (….2f)'), outerRadius: below(70) },
        expected: 'Cambia el formato a dos decimales y reduce el tamaño del gráfico (menos que el 70 por defecto), y confirma los dos cambios.',
      }),
      ask('métrica', 'Que mida Total Usado en vez de Total No Usado', {
        outcome: 'applied',
        changes: { metric: metric('total_uso') },
        expected: 'Cambia la métrica del gráfico a Total Usado, conserva el resto y lo confirma.',
      }),
      ask('sin leyenda', 'Quita la leyenda', {
        outcome: 'applied',
        changes: { show_legend: false },
        expected: 'Oculta la leyenda y lo confirma.',
      }),
      ask('eliminar', 'Bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
]);
