import type { Group } from '../../core/types';
import { ask, group, type PayCircuit } from '../circuit';

const PERSONAS = group('personas', [
  {
    id: 'personas-1',
    name: 'Personas · búsqueda',
    steps: [
      ask('buscar', 'Busca una persona llamada leiner', {
        asks: true,
        calls: [],
        expected:
          'Pregunta una sola vez a qué cliente (ente gestor u operador de recaudo) pertenece, porque la búsqueda lo necesita; no inventa datos de la persona.',
      }),
    ],
  },
]);

const VENTAS = group('ventas', [
  {
    id: 'ventas-1',
    name: 'Ventas · manual del vendedor',
    steps: [
      ask('recarga', '¿Cómo hago una recarga desde METPAY?', {
        calls: ['search_knowledge'],
        expected: 'Explica los pasos de una recarga según el manual del vendedor, en palabras simples y breve; si el manual no lo cubre, lo dice.',
      }),
    ],
  },
]);

export const PAY_GROUPS: Group<PayCircuit>[] = [PERSONAS, VENTAS];
