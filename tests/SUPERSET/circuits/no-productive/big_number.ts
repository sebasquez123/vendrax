import { ask, breakChart, group } from '../../harness/circuit';
import { above, below, matching, metric, timeRangeOn } from '../../harness/checks';

export const BIG_NUMBER = group('big_number', [
  {
    id: 'big_number-1',
    name: 'Número clave · subtítulo, tamaño y formato',
    dataset: 'VIEW_CONTRACT_BALANCE_HISTORY',
    steps: [
      ask('crear', 'Crea un número clave con el Total Beneficio Techo, sin línea de tendencia; llámalo "E2E número 1" y agrégalo a este dashboard', {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('total_beneficio_techo') },
        expected:
          'Crea el número clave "E2E número 1" con el Total Beneficio Techo, sin tendencia, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Ponle de subtítulo "Beneficio asignado" y haz el número más grande', {
        outcome: 'applied',
        changes: { subtitle: 'Beneficio asignado', header_font_size: above(0.4) },
        allowAlso: ['subheader', 'subtitle_font_size'],
        expected: 'Pone "Beneficio asignado" como subtítulo y agranda el número (más que el tamaño por defecto), y confirma los dos cambios.',
      }),
      ask('formato', 'Muestra el número sin decimales', {
        outcome: 'applied',
        changes: { y_axis_format: matching(/(0f|d)$/, 'un formato sin decimales (…0f o …d)') },
        expected: 'Cambia el formato del número para que no muestre decimales y lo confirma.',
      }),
      breakChart('estropear', { metric: 'METRICA_INEXISTENTE' }),
      ask('arreglar', 'El número dejó de cargar, ¿lo puedes arreglar?', {
        outcome: 'applied',
        changes: { metric: metric('total_beneficio_techo') },
        expected:
          'Encuentra que el número mide una métrica que no existe (METRICA_INEXISTENTE), vuelve a Total Beneficio Techo como estaba y explica en breve qué pasó.',
      }),
      ask('no disponible', 'Pon el número en color rojo', {
        outcome: 'not_applied',
        expected:
          'No cambia nada: dice que el color del número no se puede cambiar desde aquí y, si existe, ofrece lo más cercano que sí, sin aplicarlo.',
      }),
      ask('eliminar', 'Bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
  {
    id: 'big_number-2',
    name: 'Número clave con tendencia · tendencia, filtro y métrica',
    dataset: 'VIEW_ACTIVITY_SUPERVISION_LOGS',
    steps: [
      ask(
        'crear',
        'Crea un número clave de Total Validaciones Online con su línea de tendencia por mes usando DATE_TIME; llámalo "E2E número 2" y agrégalo a este dashboard',
        {
          outcome: 'created',
          changes: { viz_type: 'big_number', metric: metric('Total_Validaciones_Online') },
          expected:
            'Crea el número clave "E2E número 2" con Total Validaciones Online y su tendencia mensual por DATE_TIME, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
        }
      ),
      ask('tendencia', 'Que la tendencia sea por semana y que no empiece en cero', {
        outcome: 'applied',
        changes: { time_grain_sqla: 'P1W', start_y_axis_at_zero: false },
        expected: 'Cambia la tendencia a semanas y hace que su eje no empiece en cero, y confirma los dos cambios.',
      }),
      ask('subtítulo', 'Ponle de subtítulo "Por semana" en letra pequeña', {
        outcome: 'applied',
        changes: { subtitle: 'Por semana', subtitle_font_size: below(0.15) },
        allowAlso: ['subheader'],
        expected: 'Pone "Por semana" como subtítulo con un tamaño menor que el de por defecto, y lo confirma.',
      }),
      ask('periodo', 'Muestra solo los últimos 90 días', {
        outcome: 'applied',
        changes: { adhoc_filters: timeRangeOn('DATE_TIME') },
        allowAlso: ['time_range'],
        expected: 'Filtra el número a los últimos 90 días por DATE_TIME y lo confirma.',
      }),
      ask('sin tendencia', 'Quita la línea de tendencia', {
        outcome: 'applied',
        changes: { show_trend_line: false },
        expected: 'Oculta la línea de tendencia y lo confirma.',
      }),
      ask('métrica', 'Que muestre Total Validaciones Offline', {
        outcome: 'applied',
        changes: { metric: metric('Total_Validaciones_Offline') },
        expected: 'Cambia la métrica del número a Total Validaciones Offline, conserva el filtro de 90 días y lo confirma.',
      }),
      ask('eliminar', 'Bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
]);
