import { ask, group } from '../../harness/circuit';
import { above, anyTimeRange, below, columns, formattingRule, hasMetric, keepsOnly, matching, metric, titled } from '../../harness/checks';
import { productionCircuit, sandboxName, TABLE_VIZ } from './production';

/**
 * Circuito Ventas de producción
 * Veinte gráficos del dashboard 97 creados en el sandbox y cambiados una vez; el degradado 'schemeYlOrBr' se rechaza.
 */
const create = (chartId: number, request: string) => `Crea ${request}; llámalo "${sandboxName(chartId)}" y agrégalo a este dashboard`;

const ENTERO = matching(/^,d$|^,\.0f$/, 'entero con separador de miles (,d)');

export const VENTAS = group('ventas', [
  productionCircuit({
    chartId: 3319,
    sliceName: 'GF_PAY_SITME_TOTAL_RECAUDO_VENTAS',
    steps: [
      ask('crear', create(3319, 'un número clave con el total de `Total recaudo por ventas`'), {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Total recaudo por ventas') },
        expected: 'Crea un número clave con el recaudo por ventas, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Haz el número un poco más grande', {
        outcome: 'applied',
        changes: { header_font_size: above(0.4) },
        expected: 'Agranda el número (más que el tamaño por defecto) y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3320,
    sliceName: 'GF_PAY_SITME_TOTAL_VENTAS',
    steps: [
      ask('pedir', create(3320, 'un número clave con el total de ventas'), {
        outcome: 'asks',
        expected:
          'No crea nada todavía: "ventas" puede ser la cantidad de ventas o el dinero recaudado; pregunta cuál, con las dos opciones en palabras simples.',
      }),
      ask('aclarar', 'La cantidad de ventas', {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Total ventas') },
        expected: 'Crea el número clave con la cantidad de ventas (Total ventas), lo agrega al dashboard y lo confirma.',
      }),
      ask('modificar', 'Muestra solo los últimos 30 días', {
        outcome: 'applied',
        changes: { adhoc_filters: anyTimeRange() },
        allowAlso: ['time_range'],
        expected: 'Cambia el rango de fechas a los últimos 30 días y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3321,
    sliceName: 'GF_PAY_SITME_TOTAL_VENTAS_X_HORA',
    steps: [
      ask('crear', create(3321, 'un número clave con la cantidad de ventas (`Total ventas`) y su línea de tendencia por hora usando `DATE_TIME`'), {
        outcome: 'created',
        changes: { viz_type: 'big_number', metric: metric('Total ventas') },
        expected: 'Crea un número clave con tendencia por hora de la cantidad de ventas, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Que la línea de tendencia no empiece en cero', {
        outcome: 'applied',
        changes: { start_y_axis_at_zero: false },
        expected: 'Hace que el eje de la tendencia no empiece en cero y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3322,
    sliceName: 'GF_PAY_SITME_RECAUDO_TOTAL_X_DIA',
    steps: [
      ask(
        'crear',
        create(
          3322,
          'un gráfico de área de `Total recaudo por ventas` por día usando `DATE_TIME`, separado por `MOVEMENT_CATEGORY_DESC`, solo con los movimientos `Venta Tarjeta` y `Recarga`'
        ),
        {
          outcome: 'created',
          changes: {
            viz_type: 'echarts_area',
            x_axis: 'DATE_TIME',
            metrics: hasMetric('Total recaudo por ventas'),
            groupby: columns('MOVEMENT_CATEGORY_DESC'),
            adhoc_filters: keepsOnly('MOVEMENT_CATEGORY_DESC', 'Venta Tarjeta', 'Recarga'),
          },
          expected:
            'Crea el gráfico de área por día, una serie por tipo de movimiento, filtrado a Venta Tarjeta y Recarga, lo agrega al dashboard y lo confirma, sin preguntar nada.',
        }
      ),
      ask('modificar', 'Pon el eje Y en escala logarítmica y marca los puntos', {
        outcome: 'applied',
        changes: { logAxis: true, markerEnabled: true },
        allowAlso: ['markerSize'],
        expected: 'Pone la escala logarítmica y activa los puntos, y confirma los dos cambios.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3323,
    sliceName: 'PAY_SITME_TABLA_VENTAS',
    steps: [
      ask(
        'crear',
        create(
          3323,
          'una tabla con `DATE_TIME`, `PLACE`, `SELLER`, `DEVICE`, `MOVEMENT_CATEGORY_DESC`, `STATUS_DESC`, `ACCOUNT` y `VALUE_MONEY`, con máximo 1000 filas'
        ),
        {
          outcome: 'created',
          changes: {
            viz_type: TABLE_VIZ,
            'groupby|all_columns': columns(
              'DATE_TIME',
              'PLACE',
              'SELLER',
              'DEVICE',
              'MOVEMENT_CATEGORY_DESC',
              'STATUS_DESC',
              'ACCOUNT',
              'VALUE_MONEY'
            ),
            row_limit: 1000,
          },
          expected: 'Crea la tabla con esas ocho columnas y un máximo de 1000 filas, la agrega al dashboard y lo confirma, sin preguntar nada.',
        }
      ),
      ask('modificar', 'Ponle buscador y deja reordenar las columnas', {
        outcome: 'applied',
        changes: { include_search: true, allow_rearrange_columns: true },
        expected: 'Activa el buscador y permite reordenar las columnas, y confirma los dos cambios.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3324,
    sliceName: 'GF_PAY_SITME_TOTAL_RECAUDO_X_VENTAS',
    steps: [
      ask('crear', create(3324, 'un número clave con el recaudo por ventas (`Total recaudo por ventas`)'), {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Total recaudo por ventas') },
        expected: 'Crea un número clave con el recaudo por ventas, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Ponle de subtítulo "Recaudo semanal" en letra pequeña', {
        outcome: 'applied',
        changes: { subtitle: 'Recaudo semanal', subtitle_font_size: below(0.15) },
        allowAlso: ['subheader'],
        expected: 'Pone "Recaudo semanal" como subtítulo con un tamaño menor que el de por defecto, y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3325,
    sliceName: 'GF_VOA_SITME_TOTAL_VENTAS',
    steps: [
      ask('crear', create(3325, 'un número clave con la cantidad de ventas'), {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Total ventas') },
        expected:
          'Crea un número clave con la cantidad de ventas (Total ventas), sin preguntar cuál "ventas" porque el usuario dijo "cantidad", lo agrega al dashboard y lo confirma.',
      }),
      ask('modificar', 'Renombra el gráfico a "VOA total ventas"', {
        outcome: 'applied',
        changes: { slice_name: titled('VOA total ventas') },
        expected: 'Renombra el gráfico a "VOA total ventas" (con el prefijo del dominio) y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3326,
    sliceName: 'GF_PAY_SITME_TOTAL_REMBOLSO_VENTAS',
    steps: [
      ask('crear', create(3326, 'un número clave con el total de reembolsos (`Total rembolso`)'), {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Total rembolso') },
        expected: 'Crea un número clave con el total de reembolsos, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Muestra el número completo con separador de miles, sin abreviarlo', {
        outcome: 'applied',
        changes: { y_axis_format: ENTERO },
        expected: 'Cambia el formato a entero con separador de miles (sin abreviar) y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3327,
    sliceName: 'GF_PAY_SITME_TOTAL_VENTAS2_X_MES',
    steps: [
      ask(
        'crear',
        create(
          3327,
          'un gráfico de área de `Total recaudo por ventas` por mes usando `DATE_TIME`, solo con los movimientos `Recarga`, `Venta Tarjeta` y `Repayment`'
        ),
        {
          outcome: 'created',
          changes: {
            viz_type: 'echarts_area',
            x_axis: 'DATE_TIME',
            metrics: hasMetric('Total recaudo por ventas'),
            time_grain_sqla: 'P1M',
            adhoc_filters: keepsOnly('MOVEMENT_CATEGORY_DESC', 'Recarga', 'Venta Tarjeta', 'Repayment'),
          },
          expected: 'Crea el gráfico de área mensual filtrado a esos tres movimientos, lo agrega al dashboard y lo confirma, sin preguntar nada.',
        }
      ),
      ask('modificar', 'Deja solo las recargas en el filtro de movimientos', {
        outcome: 'applied',
        changes: { adhoc_filters: keepsOnly('MOVEMENT_CATEGORY_DESC', 'Recarga') },
        expected: 'Cambia el filtro de MOVEMENT_CATEGORY_DESC para que deje solo "Recarga", conserva los demás filtros y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3328,
    sliceName: 'GF_PAY_SITME_TOTAL_VENTAS2_X_METODO_PAGO',
    steps: [
      ask('crear', create(3328, 'una dona de `Total recaudo por ventas` por `PAYMENT_METHOD`'), {
        outcome: 'created',
        changes: { viz_type: 'pie', groupby: columns('PAYMENT_METHOD'), metric: metric('Total recaudo por ventas'), donut: true },
        expected: 'Crea una dona del recaudo por método de pago, la agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Muestra nombre, valor y porcentaje en las etiquetas, con líneas; muestra el total y quita la leyenda', {
        outcome: 'applied',
        changes: { label_type: 'key_value_percent', label_line: true, show_total: true, show_legend: false },
        allowAlso: ['show_labels', 'labels_outside'],
        expected: 'Aplica los cuatro cambios en el mismo turno (contenido y líneas de las etiquetas, total, sin leyenda) y los confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3329,
    sliceName: 'GF_PAY_SITME_TOTAL_RECAGAS2_X_DIA',
    steps: [
      ask('crear', create(3329, 'un gráfico de área de `Total recargas` por día usando `DATE_TIME`'), {
        outcome: 'created',
        changes: { viz_type: 'echarts_area', x_axis: 'DATE_TIME', metrics: hasMetric('Total recargas'), time_grain_sqla: 'P1D' },
        expected: 'Crea un gráfico de área de Total recargas por día, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Usa la paleta de colores de Airbnb', {
        outcome: 'applied',
        changes: { color_scheme: 'bnbColors' },
        expected: 'Cambia la paleta del gráfico a "Airbnb Colors" y lo confirma (aclara que cambia la paleta completa, si viene al caso).',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3330,
    sliceName: 'GF_PAY_SITME_TOP_VENTAS2_X_HORA',
    base: 'heatmap',
    steps: [
      ask('crear', 'Crea un mapa de calor de la cantidad de ventas (`Total ventas`) por día y por `HORA`', {
        outcome: 'not_applied',
        expected: 'No crea nada: dice que un mapa de calor no se puede crear desde aquí y ofrece un tipo que sí.',
      }),
      ask('modificar', 'En el mapa de calor, usa el degradado de amarillo, naranja y café', {
        outcome: 'not_applied',
        unsupported: { key: 'linear_color_scheme', value: 'schemeYlOrBr' },
        expected:
          'No cambia nada: dice que ese degradado no está entre los disponibles y ofrece el más cercano (de amarillo a rojo, o naranjas), sin aplicarlo.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3331,
    sliceName: 'GF_PAY_SITME_TOP_VENTAS2_POR_LUGAR',
    steps: [
      ask(
        'crear',
        create(3331, 'un gráfico de barras del recaudo (`Total`) por `PLACE`, solo con los movimientos `Recarga`, `Repayment` y `Venta Tarjeta`'),
        {
          outcome: 'created',
          changes: {
            viz_type: 'echarts_timeseries_bar',
            x_axis: 'PLACE',
            metrics: hasMetric('Total'),
            adhoc_filters: keepsOnly('MOVEMENT_CATEGORY_DESC', 'Recarga', 'Repayment', 'Venta Tarjeta'),
          },
          expected:
            'Crea las barras del recaudo por ubicación filtradas a esos tres movimientos, las agrega al dashboard y lo confirma, sin preguntar nada.',
        }
      ),
      ask('modificar', 'Ponlas horizontales y muestra solo los 10 lugares con más recaudo', {
        outcome: 'applied',
        changes: { orientation: 'horizontal', row_limit: 10 },
        allowAlso: ['order_desc'],
        expected: 'Pone las barras en horizontal y limita a los 10 lugares de mayor recaudo, y confirma los cambios.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3332,
    sliceName: 'GF_PAY_SITME_MAYOR_VENDEDOR_X_VENTAS2',
    steps: [
      ask('crear', create(3332, 'un gráfico de barras del recaudo (`Total`) por `SELLER`, solo con los movimientos `Recarga` y `Venta Tarjeta`'), {
        outcome: 'created',
        changes: {
          viz_type: 'echarts_timeseries_bar',
          x_axis: 'SELLER',
          metrics: hasMetric('Total'),
          adhoc_filters: keepsOnly('MOVEMENT_CATEGORY_DESC', 'Recarga', 'Venta Tarjeta'),
        },
        expected:
          'Crea las barras del recaudo por vendedor filtradas a esos dos movimientos, las agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Muestra solo los 5 vendedores con más recaudo y pon el eje en escala logarítmica', {
        outcome: 'applied',
        changes: { row_limit: 5, logAxis: true },
        allowAlso: ['order_desc'],
        expected: 'Limita a los 5 vendedores de mayor recaudo y pone la escala logarítmica, y confirma los cambios.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3333,
    sliceName: 'GF_PAY_SITME_TOTAL_CUENTAS2',
    steps: [
      ask('crear', create(3333, 'un número clave con `Total cuentas`'), {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Total cuentas') },
        expected: 'Crea un número clave con el total de cuentas, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Muestra el nombre de la métrica debajo del número', {
        outcome: 'applied',
        changes: { show_metric_name: true },
        allowAlso: ['metric_name_font_size'],
        expected: 'Muestra el nombre de la métrica debajo del número y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3334,
    sliceName: 'GF_PAY_SITME_TOTAL_VENDEDORES2',
    steps: [
      ask('crear', create(3334, 'un número clave con `Total vendedores`, sin filtro de fechas'), {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Total vendedores') },
        expected: 'Crea un número clave con el total de vendedores, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Muestra solo los últimos 7 días', {
        outcome: 'applied',
        changes: { adhoc_filters: anyTimeRange() },
        allowAlso: ['time_range'],
        expected: 'Agrega un rango de fechas de los últimos 7 días y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3335,
    sliceName: 'GF_PAY_SITME_TOTAL_UBICACIONES2',
    steps: [
      ask('crear', create(3335, 'un número clave con la cantidad de ubicaciones (`Lugares`)'), {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Lugares') },
        expected: 'Crea un número clave con la cantidad de ubicaciones, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Ponle de subtítulo "Ubicaciones activas"', {
        outcome: 'applied',
        changes: { subtitle: 'Ubicaciones activas' },
        allowAlso: ['subheader'],
        expected: 'Pone "Ubicaciones activas" como subtítulo y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3336,
    sliceName: 'GF_PAY_SITME_TOTAL_DISPOSITIVOS2',
    steps: [
      ask('crear', create(3336, 'un número clave con `Total Dispositivos`'), {
        outcome: 'created',
        changes: { viz_type: 'big_number_total', metric: metric('Total Dispositivos') },
        expected: 'Crea un número clave con el total de dispositivos, lo agrega al dashboard y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Cambia la métrica a `Total cuentas`', {
        outcome: 'applied',
        changes: { metric: metric('Total cuentas') },
        expected: 'Cambia la métrica del número a Total cuentas y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3339,
    sliceName: 'TABLA_VENTAS2',
    steps: [
      ask(
        'crear',
        create(
          3339,
          'una tabla con `DATE_TIME`, `PLACE`, `SELLER`, `ACCOUNT`, `PAYMENT_METHOD`, `MOVEMENT_CATEGORY_DESC` y `VALUE_MONEY`, solo con los movimientos `Recarga`, `Venta Tarjeta` y `Repayment`'
        ),
        {
          outcome: 'created',
          changes: {
            viz_type: TABLE_VIZ,
            'groupby|all_columns': columns('DATE_TIME', 'PLACE', 'SELLER', 'ACCOUNT', 'PAYMENT_METHOD', 'MOVEMENT_CATEGORY_DESC', 'VALUE_MONEY'),
            adhoc_filters: keepsOnly('MOVEMENT_CATEGORY_DESC', 'Recarga', 'Venta Tarjeta', 'Repayment'),
          },
          expected:
            'Crea la tabla con esas siete columnas filtrada a esos tres movimientos, la agrega al dashboard y lo confirma, sin preguntar nada.',
        }
      ),
      ask('modificar', 'Pinta de verde `VALUE_MONEY` cuando sea mayor a 10000', {
        outcome: 'applied',
        changes: {
          conditional_formatting: formattingRule({ column: 'VALUE_MONEY', operator: '>', targetValue: 10000, colorScheme: 'colorSuccess' }),
        },
        expected: 'Agrega una regla que pinta de verde VALUE_MONEY mayor a 10000 y lo confirma.',
      }),
    ],
  }),
  productionCircuit({
    chartId: 3340,
    sliceName: 'GF_PAY_SITME_RECAUDO_X_TIPO_VENTAS',
    steps: [
      ask(
        'crear',
        create(3340, 'un gráfico de barras del recaudo (`Total`) por `MOVEMENT_CATEGORY_DESC`, solo con los movimientos `Venta Tarjeta` y `Recarga`'),
        {
          outcome: 'created',
          changes: {
            viz_type: 'echarts_timeseries_bar',
            x_axis: 'MOVEMENT_CATEGORY_DESC',
            metrics: hasMetric('Total'),
            adhoc_filters: keepsOnly('MOVEMENT_CATEGORY_DESC', 'Venta Tarjeta', 'Recarga'),
          },
          expected:
            'Crea las barras del recaudo por tipo de movimiento filtradas a esos dos, las agrega al dashboard y lo confirma, sin preguntar nada.',
        }
      ),
      ask('modificar', 'Pon el eje Y en escala logarítmica y gira las etiquetas del eje X 45 grados', {
        outcome: 'applied',
        changes: { logAxis: true, xAxisLabelRotation: 45 },
        expected: 'Pone la escala logarítmica y gira las etiquetas del eje X a 45°, y confirma los dos cambios.',
      }),
    ],
  }),
]);
