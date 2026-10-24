import { ask, group } from '../../harness/circuit';
import { columns, timeRangeOn } from '../../harness/checks';

export const MIXED = group('mixed', [
  {
    id: 'mixed-1',
    name: 'Gráfico combinado · series, ejes y consultas',
    dataset: 'ACCOUNT_MOVEMENTS_VIEW',
    base: 'mixed',
    steps: [
      ask('segunda serie', 'En el gráfico combinado, pon la segunda serie en barras y en el eje derecho', {
        outcome: 'applied',
        changes: { seriesTypeB: 'bar', yAxisIndexB: 1 },
        expected: 'Dibuja la consulta B (transacciones) en barras sobre el eje secundario (derecho), y confirma los dos cambios.',
      }),
      ask('títulos y valores', 'Ponle título al eje derecho: "Transacciones", y muestra los valores de la primera serie', {
        outcome: 'applied',
        changes: { yAxisTitleSecondary: 'Transacciones', show_value: true },
        expected: 'Pone "Transacciones" como título del eje secundario y muestra los valores de la consulta A, y confirma los dos cambios.',
      }),
      ask('área y puntos', 'Rellena el área de la primera serie y marca sus puntos', {
        outcome: 'applied',
        changes: { area: true, markerEnabled: true },
        expected: 'Rellena el área bajo la consulta A y activa sus puntos, sin tocar la consulta B, y confirma los dos cambios.',
      }),
      ask('filtro de una consulta', 'Filtra solo la segunda serie a los últimos 90 días', {
        outcome: 'applied',
        changes: { adhoc_filters_b: timeRangeOn('DATE') },
        expected: 'Agrega un rango de 90 días por DATE solo a la consulta B (sus filtros), sin tocar los de la consulta A, y lo confirma.',
      }),
      ask('separar una consulta', 'Separa la primera serie por PAYMENT_METHOD', {
        outcome: 'applied',
        changes: { groupby: columns('PAYMENT_METHOD') },
        expected: 'Divide la consulta A en una serie por PAYMENT_METHOD, sin tocar la consulta B, y lo confirma.',
      }),
      ask('escala', 'Pon el eje derecho en escala logarítmica', {
        outcome: 'applied',
        changes: { logAxisSecondary: true },
        expected: 'Pone el eje secundario en escala logarítmica, sin tocar el principal, y lo confirma.',
      }),
      ask('cambio de tipo', 'Conviértelo en un gráfico de líneas normal', {
        outcome: 'judged',
        expected:
          'Lo convierte creando un gráfico de líneas equivalente y dice qué pierde (la segunda consulta y sus ajustes), o explica que un gráfico combinado no se convierte desde aquí y ofrece uno aparte. Nunca borra para siempre el original.',
      }),
    ],
  },
]);
