import type { VocabularyEntry, VocabularyTarget } from '../../../types';

const MOVEMENTS = 'ACCOUNT_MOVEMENTS_VIEW';

const SALES_COUNT: VocabularyTarget = {
  kind: 'metric',
  name: 'Total ventas',
  source: MOVEMENTS,
  meaning: 'cantidad de ventas (recargas y ventas de tarjeta)',
};

const SALES_MONEY: VocabularyTarget = {
  kind: 'metric',
  name: 'Total recaudo por ventas',
  source: MOVEMENTS,
  meaning: 'dinero recaudado por esas ventas',
};

export const VOCABULARY: VocabularyEntry[] = [
  { terms: ['ventas', 'total de ventas', 'total ventas'], refersTo: [SALES_COUNT, SALES_MONEY] },
  { terms: ['cantidad de ventas', 'número de ventas', 'numero de ventas'], refersTo: [SALES_COUNT] },
  { terms: ['recaudo de ventas', 'dinero de ventas', 'valor de ventas'], refersTo: [SALES_MONEY] },
  {
    terms: ['transacciones', 'total de transacciones', 'movimientos'],
    refersTo: [
      { kind: 'metric', name: 'transacciones', source: MOVEMENTS, meaning: 'cantidad de todos los movimientos de cuenta, de cualquier tipo' },
    ],
  },
];
