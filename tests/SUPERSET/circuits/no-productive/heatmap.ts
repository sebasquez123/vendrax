import { ask, group } from '../../harness/circuit';
import { matching } from '../../harness/checks';

export const HEATMAP = group('heatmap', [
  {
    id: 'heatmap-1',
    name: 'Mapa de calor · colores, comparación, orden y formato',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    base: 'heatmap',
    steps: [
      ask('colores', 'En el mapa de calor, usa tonos verdes', {
        outcome: 'applied',
        changes: { linear_color_scheme: 'schemeGreens' },
        expected: 'Cambia el degradado del mapa de calor a verdes y lo confirma.',
      }),
      ask('comparar filas', 'Compara cada fila por separado y muestra los valores en las celdas', {
        outcome: 'applied',
        changes: { normalize_across: 'y', show_values: true },
        expected: 'Hace que el color compare cada fila por separado y muestra los valores dentro de las celdas, y confirma los dos cambios.',
      }),
      ask('intervalo', 'Agrúpalo por semana', {
        outcome: 'applied',
        changes: { time_grain_sqla: 'P1W' },
        expected: 'Cambia el intervalo del eje X a semanas y lo confirma.',
      }),
      ask('orden y leyenda', 'Ordena las filas por valor de mayor a menor y muestra la leyenda por rangos', {
        outcome: 'applied',
        changes: { sort_y_axis: 'value_desc', legend_type: 'piecewise' },
        expected: 'Ordena las filas por valor descendente y cambia la leyenda a rangos, y confirma los dos cambios.',
      }),
      ask('formato', 'Abrevia los números', {
        outcome: 'applied',
        changes: { y_axis_format: matching(/s$/, 'un formato abreviado (…s)') },
        expected: 'Cambia el formato de los números a uno abreviado y lo confirma.',
      }),
      ask('no disponible', 'Pinta de rojo solo la celda más alta', {
        outcome: 'not_applied',
        expected:
          'No cambia nada: dice que el color de una celda puntual no se puede cambiar, que el mapa usa un degradado, y ofrece otro degradado (por ejemplo, de amarillo a rojo), sin aplicarlo.',
      }),
      ask('degradado', 'Entonces usa el degradado de amarillo a rojo', {
        outcome: 'applied',
        changes: { linear_color_scheme: 'schemeYlOrRd' },
        expected: 'Cambia el degradado a amarillo → rojo y lo confirma.',
      }),
    ],
  },
]);
