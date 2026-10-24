import { ask, group } from '../../harness/circuit';
import { formattingRule, hasMetric, matching } from '../../harness/checks';

export const PIVOT = group('pivot', [
  {
    id: 'pivot-1',
    name: 'Tabla dinámica · totales, métricas, orden y formato',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    base: 'pivot',
    steps: [
      ask('totales', 'En la tabla dinámica, muestra los totales por fila y por columna', {
        outcome: 'applied',
        changes: { rowTotals: true, colTotals: true },
        expected: 'Activa los totales por fila y por columna de la tabla dinámica, sin tocar nada más, y lo confirma.',
      }),
      ask('métricas', 'Agrega la métrica Total ventas y pon las métricas en filas', {
        outcome: 'applied',
        changes: { metrics: hasMetric('Total recaudo por ventas', 'Total ventas'), metricsLayout: 'ROWS' },
        expected: 'Agrega Total ventas sin quitar Total recaudo por ventas y pone las métricas en filas, y confirma los dos cambios.',
      }),
      ask('agregación', 'Que combine los valores con el promedio en vez de la suma', {
        outcome: 'applied',
        changes: { aggregateFunction: 'Average' },
        expected: 'Cambia la agregación de suma a promedio y lo confirma.',
      }),
      ask('orden y volteo', 'Ordena las filas por valor, de mayor a menor, y voltea la tabla', {
        outcome: 'applied',
        changes: { rowOrder: 'value_z_to_a', transposePivot: true },
        expected: 'Ordena las filas por valor descendente e intercambia filas y columnas, y confirma los dos cambios.',
      }),
      ask('formato condicional', 'Pinta en rojo los valores de Total recaudo por ventas menores a 100', {
        outcome: 'applied',
        changes: {
          conditional_formatting: formattingRule({ column: 'Total recaudo por ventas', operator: '<', targetValue: 100, colorScheme: 'colorError' }),
        },
        expected: 'Agrega una regla que pinta de rojo los valores de Total recaudo por ventas menores a 100 y lo confirma.',
      }),
      ask('describir', 'Agrégale una descripción: cruce por medio de validación', {
        outcome: 'applied',
        changes: { description: matching(/^cruce por medio de validación\.?$/i, '"cruce por medio de validación"') },
        expected: 'Pone la descripción pedida sin tocar la configuración de la tabla dinámica, y lo confirma.',
      }),
      ask('cambio de tipo', 'Conviértela en una tabla normal', {
        outcome: 'judged',
        expected:
          'La convierte creando una tabla equivalente y dice qué pierde (totales, disposición, formato), o explica que una tabla dinámica no se convierte desde aquí y ofrece una tabla aparte. Nunca borra para siempre el original.',
      }),
    ],
  },
]);
