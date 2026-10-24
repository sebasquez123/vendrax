import { ask, group } from '../../harness/circuit';
import { columns, hasMetric, keepsOnly, matching, metric } from '../../harness/checks';
import { productionCircuit, sandboxName, TABLE_VIZ } from './production';

/**
 * Circuito Validaciones de producción
 * Ocho gráficos del dashboard 99 creados en el sandbox y cambiados una vez; el heatmap usa el base del ingeniero.
 */
const create = (chartId: number, request: string) => `Crea ${request}; llámalo "${sandboxName(chartId)}" y agrégalo a este dashboard`;

export const VALIDACIONES = group('validaciones', [
  productionCircuit({
    chartId: 3209,
    sliceName: 'GF_PAY_SITME_VALI_X_HORA',
    steps: [
      ask('crear', create(3209, 'un número clave de `Total validaciones` con su línea de tendencia por hora usando `DATE_TIME`'), {
        outcome: 'created',
        changes: { viz_type: 'big_number', metric: metric('Total validaciones') },
        expected: 'Crea un número clave con tendencia por hora de Total validaciones, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Muestra el número entero, con separador de miles', {
        outcome: 'applied',
        changes: { y_axis_format: matching(/^,d$|^,\.0f$/, 'entero con separador de miles (,d)') },
        expected: 'Cambia el formato del número a entero con separador de miles y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3210,
    sliceName: 'GF_PAY_SITME_TOTAL_VALIDACIONES',
    steps: [
      ask('crear', create(3210, 'un número clave con el total de `Total validaciones`'), {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Total validaciones') },
        expected: 'Crea un número clave con el total de validaciones, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Ponle de subtítulo "Últimos 7 días"', {
        outcome: 'applied',
        changes: { subtitle: 'Últimos 7 días' },
        allowAlso: ['subheader'],
        expected: 'Pone "Últimos 7 días" como subtítulo del número y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3211,
    sliceName: 'GF_PAY_SITME_TOTAL_RECAUDO_X_VALIDACIONES',
    steps: [
      ask(
        'crear',
        create(3211, 'un número clave con el total de `Recaudo por validaciones`, solo de los movimientos `Validación` de `MOVEMENT_CATEGORY_DESC`'),
        {
          outcome: 'created',
          changes: {
            viz_type: 'big_number_total',
            metric: metric('Recaudo por validaciones'),
            adhoc_filters: keepsOnly('MOVEMENT_CATEGORY_DESC', 'Validación'),
          },
          expected:
            'Crea un número clave de Recaudo por validaciones filtrado a los movimientos "Validación", lo agrega al dashboard y lo confirma, sin preguntar nada.',
        }
      ),
      ask('modificar', 'Muéstralo en pesos, sin decimales', {
        outcome: 'applied',
        changes: { y_axis_format: matching(/^\$/, 'un formato en pesos ($…)') },
        expected: 'Cambia el formato del número a pesos sin decimales y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3303,
    sliceName: 'GF_PAY_SITME_VALI_X_MEDIO',
    steps: [
      ask('crear', create(3303, 'un gráfico de área de `Total validaciones` por día usando `DATE_TIME`, separado por `MEDIO_VALIDACION`'), {
        outcome: 'created',
        changes: {
          viz_type: 'echarts_area',
          x_axis: 'DATE_TIME',
          metrics: hasMetric('Total validaciones'),
          groupby: columns('MEDIO_VALIDACION'),
          time_grain_sqla: 'P1D',
        },
        expected:
          'Crea un gráfico de área de Total validaciones por día, una serie por MEDIO_VALIDACION, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Pon el eje Y en escala logarítmica, ponle zoom y marca los puntos', {
        outcome: 'applied',
        changes: { logAxis: true, zoomable: true, markerEnabled: true },
        allowAlso: ['markerSize'],
        expected: 'Aplica los tres cambios en el mismo turno (escala logarítmica, zoom y puntos) y los confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3216,
    sliceName: 'TABLA_VALIDACIONES',
    steps: [
      ask('crear', create(3216, 'una tabla agrupada por `DATE_TIME`, `PLACE`, `SELLER` y `DEVICE` con `Total validaciones`'), {
        outcome: 'created',
        changes: { viz_type: TABLE_VIZ, groupby: columns('DATE_TIME', 'PLACE', 'SELLER', 'DEVICE'), metrics: hasMetric('Total validaciones') },
        expected: 'Crea la tabla agrupada por esas cuatro columnas con Total validaciones, la agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Agrégale también las columnas `STATUS_DESC` y `MOVEMENT_CATEGORY_DESC` y quita las barras de las celdas', {
        outcome: 'applied',
        changes: {
          groupby: columns('DATE_TIME', 'PLACE', 'SELLER', 'DEVICE', 'STATUS_DESC', 'MOVEMENT_CATEGORY_DESC'),
          show_cell_bars: false,
        },
        expected: 'Agrega las dos columnas a la agrupación sin quitar las que había, quita las barras de las celdas y confirma los cambios.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3300,
    sliceName: 'GF_PAY_SITME_TOP_VALI_X_HORA',
    base: 'heatmap',
    steps: [
      ask('crear', 'Crea un mapa de calor de `Total validaciones` por día y por `HORA`', {
        outcome: 'not_applied',
        expected:
          'No crea nada: dice que un mapa de calor no se puede crear desde aquí y ofrece un tipo que sí (por ejemplo, barras o una tabla por día y hora).',
      }),
      ask(
        'modificar',
        'En el mapa de calor, usa el degradado de amarillo a rojo, muestra los valores en las celdas y ordena las filas por nombre de forma descendente',
        {
          outcome: 'applied',
          changes: { linear_color_scheme: 'schemeYlOrRd', show_values: true, sort_y_axis: 'alpha_desc' },
          expected:
            'Aplica los tres cambios al mapa de calor (degradado amarillo → rojo, valores en las celdas, filas por nombre descendente) y los confirma.',
        }
      ),
    ],
  }),
  productionCircuit({
    chartId: 3204,
    sliceName: 'GF_PAY_SITME_TOTAL_RECAUDO_X_VALIDA',
    steps: [
      ask('crear', create(3204, 'un gráfico de área de `Recaudo por validaciones` por día usando `DATE_TIME`'), {
        outcome: 'created',
        changes: { viz_type: 'echarts_area', x_axis: 'DATE_TIME', metrics: hasMetric('Recaudo por validaciones'), time_grain_sqla: 'P1D' },
        expected: 'Crea un gráfico de área de Recaudo por validaciones por día, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Pon los números del eje Y enteros con separador de miles y titula el eje Y "Recaudo"', {
        outcome: 'applied',
        changes: { y_axis_format: matching(/^,d$|^,\.0f$/, 'entero con separador de miles (,d)'), y_axis_title: 'Recaudo' },
        allowAlso: ['y_axis_title_margin'],
        expected: 'Cambia el formato del eje Y y le pone el título "Recaudo" (con su margen), y confirma los cambios.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3208,
    sliceName: 'GF_PAY_SITME_VALI_X_DIA',
    steps: [
      ask('crear', create(3208, 'un gráfico de área de `Total validaciones` por día usando `DATE_TIME`'), {
        outcome: 'created',
        changes: { viz_type: 'echarts_area', x_axis: 'DATE_TIME', metrics: hasMetric('Total validaciones'), time_grain_sqla: 'P1D' },
        expected: 'Crea un gráfico de área de Total validaciones por día, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Quita la leyenda y muestra los valores sobre el área', {
        outcome: 'applied',
        changes: { show_legend: false, show_value: true },
        expected: 'Oculta la leyenda y muestra los valores sobre el área, y confirma los dos cambios.',
      }),
    ],
  }),
]);
