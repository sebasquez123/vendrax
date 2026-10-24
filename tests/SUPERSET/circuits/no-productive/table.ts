import { ask, breakChart, group, prepareChart } from '../../harness/circuit';
import { allOf, anyTimeRange, columns, formattingRule, hasMetric, metric, noFilterOn, oneOf, sortedBy } from '../../harness/checks';

const TABLE_VIZ = oneOf('table', 'ag-grid-table');

const EMPTYING_FILTER = {
  expressionType: 'SIMPLE',
  subject: 'SELLER',
  operator: '==',
  operatorId: 'EQUALS',
  comparator: 'NO_EXISTE',
  clause: 'WHERE',
  sqlExpression: null,
  isExtra: false,
  isNew: false,
  filterOptionName: 'filter_e2e_damage',
};

const GREEN_RULE = { column: 'Recaudo por validaciones', operator: '>', targetValue: 1000, colorScheme: 'colorSuccess' };

export const TABLES = group('table', [
  {
    id: 'table-1',
    name: 'Tabla agrupada · opciones, orden y formato',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    steps: [
      ask('crear', 'Crea una tabla con Total recargas por SELLER, llámala "E2E tabla 1" y agrégala a este dashboard', {
        outcome: 'created',
        changes: { viz_type: TABLE_VIZ, groupby: columns('SELLER'), metrics: hasMetric('Total recargas') },
        expected:
          'Crea la tabla "E2E tabla 1" agrupada por SELLER con Total recargas, la agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
      }),
      ask('modificar', 'Ponle buscador y muestra la fila de totales', {
        outcome: 'applied',
        changes: { include_search: true, show_totals: true },
        expected: 'Activa el buscador y la fila de totales, y confirma los dos cambios.',
      }),
      ask('métrica y orden', 'Agrega la métrica Recaudo por recargas y ordena la tabla por ella, de mayor a menor', {
        outcome: 'applied',
        changes: { metrics: hasMetric('Total recargas', 'Recaudo por recargas'), timeseries_limit_metric: metric('Recaudo por recargas') },
        allowAlso: ['order_desc'],
        expected: 'Agrega Recaudo por recargas sin quitar Total recargas, ordena las filas por Recaudo por recargas de mayor a menor y lo confirma.',
      }),
      ask('orden imposible', 'Ahora ordénala por SELLER', {
        outcome: 'not_applied',
        expected: 'No cambia nada: explica que una tabla agrupada solo se ordena por una métrica y ofrece ordenarla por una de las suyas.',
      }),
      ask('columna inexistente', 'Agrega la columna CLIENTE_X', {
        outcome: 'not_applied',
        expected: 'No cambia nada: dice que la columna CLIENTE_X no existe en los datos y ofrece columnas que sí existen.',
      }),
      breakChart('estropear', (params) => ({
        adhoc_filters: [...(Array.isArray(params['adhoc_filters']) ? params['adhoc_filters'] : []), EMPTYING_FILTER],
      })),
      ask('arreglar', 'La tabla quedó vacía de repente, ¿puedes revisar qué pasó y arreglarla?', {
        outcome: 'applied',
        changes: { adhoc_filters: noFilterOn('SELLER') },
        expected:
          'Encuentra el filtro que deja la tabla vacía (SELLER igual a "NO_EXISTE"), lo quita sin tocar los demás filtros y explica en breve qué pasó.',
      }),
      ask('formato condicional', 'Pon en rojo Total recargas cuando sea mayor a 1000', {
        outcome: 'applied',
        changes: {
          conditional_formatting: formattingRule({ column: 'Total recargas', operator: '>', targetValue: 1000, colorScheme: 'colorError' }),
        },
        expected: 'Agrega una regla que pinta de rojo las celdas de Total recargas mayores a 1000 y lo confirma.',
      }),
      ask('eliminar', 'Ya está, bórrala definitivamente', {
        outcome: 'deleted',
        expected: 'Borra la tabla de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
  {
    id: 'table-2',
    name: 'Tabla · fechas, porcentajes y fila por fila',
    dataset: 'VIEW_CONTRACT_BALANCE_HISTORY',
    steps: [
      ask('crear', 'Crea una tabla con Usuarios Beneficiarios por CONTRAC_NAME, llámala "E2E tabla 2" y agrégala a este dashboard', {
        outcome: 'created',
        changes: { viz_type: TABLE_VIZ, groupby: columns('CONTRAC_NAME'), metrics: hasMetric('usuarios_beneficiarios') },
        expected:
          'Crea la tabla "E2E tabla 2" agrupada por CONTRAC_NAME con Usuarios Beneficiarios, la agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
      }),
      ask('rango de fechas', 'Muestra solo los últimos 30 días', {
        outcome: 'applied',
        changes: { adhoc_filters: anyTimeRange() },
        allowAlso: ['time_range', 'granularity_sqla'],
        expected: 'Filtra la tabla a los últimos 30 días por una de sus fechas (y dice cuál), conserva los demás filtros y lo confirma.',
      }),
      ask('porcentaje', 'Muestra Usuarios Beneficiarios también como porcentaje del total', {
        outcome: 'applied',
        changes: { percent_metrics: hasMetric('usuarios_beneficiarios') },
        expected: 'Agrega Usuarios Beneficiarios como porcentaje del total (de las filas traídas) sin quitar la métrica original, y lo confirma.',
      }),
      ask('sin columnas', 'No la agrupes', {
        outcome: 'asks',
        expected: 'No cambia nada todavía: pregunta qué columnas mostrar fila por fila, o propone algunas, y espera la respuesta.',
      }),
      ask('fila por fila', 'Muestra cada registro con DATE_TIME, CONTRAC_NAME y PERSON_NAME', {
        outcome: 'applied',
        changes: { query_mode: 'raw', all_columns: columns('DATE_TIME', 'CONTRAC_NAME', 'PERSON_NAME') },
        allowAlso: ['groupby', 'metrics', 'percent_metrics', 'timeseries_limit_metric', 'order_desc'],
        expected: 'Pasa la tabla a un registro por fila con DATE_TIME, CONTRAC_NAME y PERSON_NAME, conserva el rango de 30 días y lo confirma.',
      }),
      ask('paginación', 'Muestra 50 filas por página', {
        outcome: 'applied',
        changes: { page_length: 50 },
        expected: 'Pone la paginación en 50 filas por página y lo confirma.',
      }),
      ask('orden', 'Ordénala por DATE_TIME, de la más reciente a la más antigua', {
        outcome: 'applied',
        changes: { order_by_cols: sortedBy('DATE_TIME', false) },
        expected: 'Ordena los registros por DATE_TIME de forma descendente y lo confirma.',
      }),
      ask('cambio de tipo', 'Conviértela en un gráfico de barras', {
        outcome: 'judged',
        expected:
          'La convierte creando un gráfico de barras equivalente y dice qué conserva y qué pierde (el detalle fila por fila: las barras agrupan), o explica por qué no se puede y ofrece uno aparte. Nunca borra para siempre el original.',
      }),
      ask('eliminar', 'Bórrala definitivamente', {
        outcome: 'deleted',
        expected: 'Borra la tabla de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
  {
    id: 'table-3',
    name: 'Tabla de producción · SQL, formato y paginación',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    steps: [
      ask('crear', 'Crea una tabla con Recaudo por validaciones por PLACE, llámala "E2E tabla 3" y agrégala a este dashboard', {
        outcome: 'created',
        changes: { viz_type: TABLE_VIZ, groupby: columns('PLACE'), metrics: hasMetric('Recaudo por validaciones') },
        expected:
          'Crea la tabla "E2E tabla 3" agrupada por PLACE con Recaudo por validaciones, la agrega al dashboard seleccionado y lo confirma, sin preguntar nada.',
      }),
      prepareChart('preparar', {
        sqlMetrics: [{ label: 'Registros (SQL)', sql: 'COUNT(*)' }],
        sqlFilters: ['DEVICE IS NOT NULL'],
        timeRange: { column: 'DATE_TIME', range: 'Last year' },
        set: { conditional_formatting: [GREEN_RULE] },
      }),
      ask('otra regla', 'Pinta de amarillo Recaudo por validaciones cuando sea menor a 500, sin quitar la regla que ya tiene', {
        outcome: 'applied',
        changes: {
          conditional_formatting: allOf(
            formattingRule(GREEN_RULE),
            formattingRule({ column: 'Recaudo por validaciones', operator: '<', targetValue: 500, colorScheme: 'colorWarning' })
          ),
        },
        expected: 'Agrega la regla amarilla para Recaudo por validaciones menor a 500 y conserva la regla verde que ya existía; lo confirma.',
      }),
      ask('datos y aspecto', 'Agrúpala también por DEVICE, ponle buscador y muestra 20 filas por página', {
        outcome: 'applied',
        changes: { groupby: columns('PLACE', 'DEVICE'), include_search: true, page_length: 20 },
        expected:
          'Agrega DEVICE a la agrupación, activa el buscador y pone 20 filas por página, sin tocar las métricas ni los filtros; confirma los tres cambios.',
      }),
      ask('celdas', 'Quita las barras de las celdas y el color según el signo', {
        outcome: 'applied',
        changes: { show_cell_bars: false, color_pn: false },
        expected: 'Quita las barras dentro de las celdas y el color por signo, y confirma los dos cambios.',
      }),
      ask('paginación del servidor', 'Trae los datos por páginas de 50 desde el servidor', {
        outcome: 'applied',
        changes: { server_pagination: true, server_page_length: 50 },
        allowAlso: ['page_length'],
        expected: 'Activa la paginación del servidor con páginas de 50 (y avisa que es experimental, si viene al caso), y lo confirma.',
      }),
      ask(
        'porcentaje y orden',
        'Muestra Recaudo por validaciones como porcentaje del total y ordena la tabla por Recaudo por validaciones de menor a mayor',
        {
          outcome: 'applied',
          changes: {
            percent_metrics: hasMetric('Recaudo por validaciones'),
            timeseries_limit_metric: metric('Recaudo por validaciones'),
            order_desc: false,
          },
          expected:
            'Agrega Recaudo por validaciones en porcentaje del total, ordena las filas por Recaudo por validaciones de menor a mayor y confirma los cambios.',
        }
      ),
      ask('cambio de tipo', 'Conviértela en un gráfico circular', {
        outcome: 'judged',
        expected:
          'La convierte creando un gráfico circular equivalente y dice qué pierde (la métrica y el filtro con fórmula SQL, el formato), o explica por qué no se puede y ofrece uno aparte. Nunca borra para siempre el original.',
      }),
      ask('eliminar', 'Bórrala definitivamente', {
        outcome: 'deleted',
        expected: 'Borra la tabla de forma definitiva y avisa que no se puede deshacer.',
      }),
    ],
  },
]);
