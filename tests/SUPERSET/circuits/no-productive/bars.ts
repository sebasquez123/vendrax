import { ask, breakChart, group, prepareChart } from '../../harness/circuit';
import { allOf, columns, hasMetric, hasSqlFilter, matching, timeRangeOn, titled } from '../../harness/checks';

export const BARS = group('bars', [
  {
    id: 'bars-1',
    name: 'Barras · 1 parámetro',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    steps: [
      ask('crear', 'Crea un gráfico de barras con Total ventas por mes usando DATE_TIME, llámalo "E2E barras 1" y agrégalo a este dashboard', {
        outcome: 'created',
        changes: { viz_type: 'echarts_timeseries_bar', x_axis: 'DATE_TIME', metrics: hasMetric('Total ventas') },
        expected:
          'Crea el gráfico de barras "E2E barras 1" con Total ventas por mes de DATE_TIME, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Ponle título al eje Y: Ventas', {
        outcome: 'applied',
        changes: { y_axis_title: 'Ventas' },
        allowAlso: ['y_axis_title_margin'],
        expected: 'Pone "Ventas" como título del eje Y del gráfico "E2E barras 1" y lo confirma.',
      }),
      breakChart('estropear', { show_legend: false }),
      ask('arreglar', 'No se ve la leyenda del gráfico, ¿la puedes mostrar?', {
        outcome: 'applied',
        changes: { show_legend: true },
        expected: 'Vuelve a mostrar la leyenda del gráfico y lo confirma, sin cambiar nada más.',
      }),
      ask('eliminar', 'Listo, ya no lo necesito: bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
  {
    id: 'bars-2',
    name: 'Barras · 2 parámetros',
    dataset: 'VIEW_ACTIVITY_SUPERVISION_LOGS',
    steps: [
      ask(
        'crear',
        'Crea un gráfico de barras apiladas con Total Validaciones Online por día usando DATE_TIME, separado por VALIDATION_METHOD; llámalo "E2E barras 2" y agrégalo a este dashboard',
        {
          outcome: 'created',
          changes: {
            viz_type: 'echarts_timeseries_bar',
            x_axis: 'DATE_TIME',
            metrics: hasMetric('Total_Validaciones_Online'),
            groupby: columns('VALIDATION_METHOD'),
            stack: 'Stack',
          },
          expected:
            'Crea el gráfico de barras apiladas "E2E barras 2" con Total Validaciones Online por día, una serie por VALIDATION_METHOD, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
        }
      ),
      ask('modificar', 'Pon la leyenda abajo y gira las etiquetas del eje X 45 grados', {
        outcome: 'applied',
        changes: { legendOrientation: 'bottom', xAxisLabelRotation: 45 },
        allowAlso: ['show_legend'],
        expected: 'Mueve la leyenda abajo y gira 45 grados las etiquetas del eje X, y confirma los dos cambios.',
      }),
      breakChart('estropear', { groupby: ['COLUMNA_INEXISTENTE'] }),
      ask('arreglar', 'El gráfico dejó de cargar, ¿lo puedes arreglar?', {
        outcome: 'applied',
        changes: { groupby: columns('VALIDATION_METHOD') },
        expected:
          'Encuentra que el gráfico separa las series por una columna que no existe (COLUMNA_INEXISTENTE), la reemplaza por VALIDATION_METHOD como estaba y explica en breve qué pasó.',
      }),
      ask('eliminar', 'Gracias, ahora bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
  {
    id: 'bars-3',
    name: 'Barras · lo que no se aplica',
    dataset: 'VIEW_CONTRACT_BALANCE_HISTORY',
    steps: [
      ask(
        'crear',
        'Crea un gráfico de barras con Total Usado en el eje Y y PERSON_PROFILE en el eje X; llámalo "E2E barras 3" y agrégalo a este dashboard',
        {
          outcome: 'created',
          changes: { viz_type: 'echarts_timeseries_bar', x_axis: 'PERSON_PROFILE', metrics: hasMetric('total_uso') },
          expected:
            'Crea el gráfico de barras "E2E barras 3" con Total Usado por PERSON_PROFILE en el eje X, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
        }
      ),
      ask('sin fecha', 'Agrúpalo por semana', {
        outcome: 'judged',
        expected:
          'Pone una fecha en el eje X por semana y conserva PERSON_PROFILE como series, y dice claramente que cambió el eje X; o no cambia nada y ofrece hacerlo, porque el intervalo de tiempo solo aplica con un eje X de fecha. Cambiar el eje sin decirlo, o perder PERSON_PROFILE, no cumple.',
      }),
      ask('no disponible', 'Cambia el color del texto de la leyenda a rojo', {
        outcome: 'not_applied',
        expected:
          'No cambia nada: dice que el color del texto de la leyenda no se puede cambiar desde aquí y ofrece lo más cercano que sí (moverla, ocultarla u otra paleta), sin aplicarlo.',
      }),
      ask('tags', 'Ponle la etiqueta beneficios', {
        outcome: 'not_applied',
        expected: 'No cambia nada: explica que las etiquetas que clasifican el gráfico (tags) no se gestionan desde aquí.',
      }),
      ask('modificar', 'Ponlas horizontales y muestra los valores sobre las barras', {
        outcome: 'applied',
        changes: { orientation: 'horizontal', show_value: true },
        expected: 'Pone las barras en horizontal y muestra los valores sobre ellas, y confirma los dos cambios.',
      }),
      ask('título', 'Ponle de título Uso por perfil', {
        outcome: 'applied',
        changes: { slice_name: titled('Uso por perfil') },
        expected:
          'Renombra el gráfico a "Uso por perfil" (con el prefijo del dominio) y lo confirma: "título" a secas es el del gráfico, sin preguntar, porque el gráfico no tiene títulos de eje.',
      }),
      ask('eliminar', 'Bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
  {
    id: 'bars-4',
    name: 'Barras · gráfico de producción (SQL y rango de fechas)',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    steps: [
      ask(
        'crear',
        'Crea un gráfico de barras con Recaudo por recargas por mes usando DATE, separado por PAYMENT_METHOD; llámalo "E2E barras 4" y agrégalo a este dashboard',
        {
          outcome: 'created',
          changes: {
            viz_type: 'echarts_timeseries_bar',
            x_axis: 'DATE',
            metrics: hasMetric('Recaudo por recargas'),
            groupby: columns('PAYMENT_METHOD'),
          },
          expected:
            'Crea el gráfico de barras "E2E barras 4" con Recaudo por recargas por mes de DATE, una serie por PAYMENT_METHOD, lo agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
        }
      ),
      prepareChart('preparar', {
        sqlMetrics: [{ label: 'Movimientos (SQL)', sql: 'COUNT(*)' }],
        sqlFilters: ['SELLER IS NOT NULL'],
        timeRange: { column: 'DATE', range: 'Last year' },
      }),
      ask('apilar y valores', 'Apila las barras al 100 % y muestra los valores', {
        outcome: 'applied',
        changes: { stack: 'Expand', show_value: true },
        expected: 'Apila las barras al 100 % y muestra los valores, sin tocar las métricas ni los filtros, y confirma los dos cambios.',
      }),
      ask('otra métrica', 'Agrega la métrica Total recargas', {
        outcome: 'applied',
        changes: { metrics: hasMetric('Recaudo por recargas', 'Movimientos (SQL)', 'Total recargas') },
        expected: 'Agrega Total recargas y conserva Recaudo por recargas y la métrica con fórmula SQL "Movimientos (SQL)"; lo confirma.',
      }),
      ask('periodo', 'Cambia el periodo a los últimos 3 meses', {
        outcome: 'applied',
        changes: { adhoc_filters: allOf(timeRangeOn('DATE', 'Last year'), hasSqlFilter('SELLER IS NOT NULL')) },
        expected: 'Cambia el rango de fechas del último año a los últimos 3 meses, conserva el filtro con fórmula SQL y lo confirma.',
      }),
      ask('tres a la vez', 'Pon la leyenda a la izquierda, ponle zoom y gira las etiquetas del eje X 90 grados', {
        outcome: 'applied',
        changes: { legendOrientation: 'left', zoomable: true, xAxisLabelRotation: 90 },
        allowAlso: ['show_legend'],
        expected: 'Aplica los tres cambios en el mismo turno (leyenda a la izquierda, barra de zoom, etiquetas del eje X a 90°) y los confirma.',
      }),
      ask('ejes', 'Pon los números del eje Y abreviados en millones y titula los ejes: "Mes" el X y "Recaudo" el Y', {
        outcome: 'applied',
        changes: { y_axis_format: matching(/s$/, 'un formato abreviado (…s)'), x_axis_title: 'Mes', y_axis_title: 'Recaudo' },
        allowAlso: ['x_axis_title_margin', 'y_axis_title_margin'],
        expected: 'Abrevia los números del eje Y, pone "Mes" y "Recaudo" como títulos de los ejes (con su margen) y lo confirma.',
      }),
      ask('cambio de tipo', 'Conviértelo en un gráfico de líneas', {
        outcome: 'judged',
        expected:
          'Lo convierte creando un gráfico de líneas equivalente y dice qué conserva y qué pierde (la métrica y el filtro con fórmula SQL no se reconstruyen), o explica por qué no se puede y ofrece uno aparte. Nunca borra para siempre el original.',
      }),
      ask('eliminar', 'Bórralo definitivamente', {
        outcome: 'deleted',
        expected: 'Borra el gráfico de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
]);
