import { ask, breakChart, group } from '../../harness/circuit';
import { above, columns, hasMetric, matching } from '../../harness/checks';

export const LINES = group('lines', [
  {
    id: 'lines-1',
    name: 'Líneas · ejes, puntos y descripción',
    dataset: 'VIEW_CONTRACT_BALANCE_HISTORY',
    steps: [
      ask('crear', 'Crea un gráfico de líneas con Total Usado por día usando DATE_TIME, llámalo "E2E líneas 1" y agrégalo a este dashboard', {
        outcome: 'created',
        changes: { viz_type: 'echarts_timeseries_line', x_axis: 'DATE_TIME', metrics: hasMetric('total_uso') },
        expected:
          'Crea el gráfico de líneas "E2E líneas 1" con Total Usado por día de DATE_TIME, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Que el eje Y empiece en 0 y marca cada punto de la línea', {
        outcome: 'applied',
        changes: { truncateYAxis: true, y_axis_bounds: [0, null], markerEnabled: true },
        allowAlso: ['markerSize'],
        expected: 'Fija el inicio del eje Y en 0 (sin máximo fijo) y activa los puntos de la línea, y confirma los dos cambios.',
      }),
      ask('intervalo', 'Agrúpalo por semana', {
        outcome: 'applied',
        changes: { time_grain_sqla: 'P1W' },
        expected: 'Cambia el intervalo de tiempo del eje X a semanas y lo confirma.',
      }),
      ask('describir', 'Agrégale una descripción: uso semanal de beneficios', {
        outcome: 'applied',
        changes: { description: matching(/^uso semanal de beneficios\.?$/i, '"uso semanal de beneficios"') },
        expected: 'Pone "uso semanal de beneficios" como descripción del gráfico y lo confirma, sin cambiar su configuración.',
      }),
      breakChart('estropear', { logAxis: true }),
      ask('arreglar', 'El eje Y del gráfico se ve raro: salta de 10 a 100 y luego a 1000. ¿Lo puedes dejar normal?', {
        outcome: 'applied',
        changes: { logAxis: false },
        expected: 'Encuentra que el eje Y está en escala logarítmica, lo vuelve a la escala normal y lo explica en breve.',
      }),
      ask('ambiguo', 'Cambia la leyenda a "Uso"', {
        outcome: 'asks',
        expected:
          'No cambia nada: pregunta si se refiere a la leyenda (su texto no se cambia desde aquí) o al título de un eje, con las opciones en palabras simples.',
      }),
      ask('aclarar', 'Al título del eje Y', {
        outcome: 'applied',
        changes: { y_axis_title: 'Uso' },
        allowAlso: ['y_axis_title_margin'],
        expected: 'Pone "Uso" como título del eje Y y lo confirma.',
      }),
      ask('eliminar', 'Listo, bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
  {
    id: 'lines-2',
    name: 'Área · combinaciones de aspecto y de datos',
    dataset: 'VIEW_ACTIVITY_SUPERVISION_LOGS',
    steps: [
      ask(
        'crear',
        'Crea un gráfico de área con Total Dispositivos Involucrados por mes usando DATE_TIME, separado por TYPE; llámalo "E2E área 1" y agrégalo a este dashboard',
        {
          outcome: 'created',
          changes: { viz_type: 'echarts_area', x_axis: 'DATE_TIME', metrics: hasMetric('Total_Dispositivos_Involucrados'), groupby: columns('TYPE') },
          expected:
            'Crea el gráfico de área "E2E área 1" con Total Dispositivos Involucrados por mes de DATE_TIME, una serie por TYPE, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
        }
      ),
      ask('apilar y zoom', 'Apila las áreas y ponle zoom', {
        outcome: 'applied',
        changes: { stack: 'Stack', zoomable: true },
        expected: 'Apila las series y agrega la barra de zoom, y confirma los dos cambios.',
      }),
      ask('leyenda', 'Pon la leyenda a la derecha y que muestre todos los elementos, sin desplazarse', {
        outcome: 'applied',
        changes: { legendOrientation: 'right', legendType: 'plain' },
        allowAlso: ['show_legend'],
        expected: 'Mueve la leyenda a la derecha con todos sus elementos visibles (estilo plano, sin desplazamiento) y lo confirma.',
      }),
      ask('puntos', 'Marca los puntos y hazlos más grandes', {
        outcome: 'applied',
        changes: { markerEnabled: true, markerSize: above(6) },
        expected: 'Activa los puntos y los agranda más que el tamaño por defecto (6), y lo confirma.',
      }),
      ask('formatos', 'Muestra las fechas del eje X como mes/año y abrevia los números del eje Y', {
        outcome: 'applied',
        changes: {
          x_axis_time_format: matching(/%[mbB].*%[Yy]|%[Yy].*%[mbB]/, 'un formato de mes y año'),
          y_axis_format: matching(/s$|^SMART_NUMBER$/, 'un formato abreviado (…s o SMART_NUMBER)'),
        },
        expected: 'Cambia el formato de las fechas del eje X a mes/año y abrevia los números del eje Y, y lo confirma.',
      }),
      ask('intervalo y filas', 'Agrúpalo por trimestre y trae máximo 500 filas', {
        outcome: 'applied',
        changes: { time_grain_sqla: 'P3M', row_limit: 500 },
        expected: 'Cambia el intervalo de tiempo a trimestres y el límite de filas a 500, y confirma los dos cambios.',
      }),
      ask('límite del eje', 'Que el eje Y llegue hasta 2000', {
        outcome: 'applied',
        changes: { truncateYAxis: true, y_axis_bounds: [null, 2000] },
        expected:
          'Fija el máximo del eje Y en 2000 sin mínimo fijo, y lo confirma (aclara que solo amplía el eje, no oculta datos, si viene al caso).',
      }),
      ask('eliminar', 'Bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
]);
