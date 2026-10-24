import type { Group } from '../../harness/circuit';
import { BARS } from './bars';
import { BIG_NUMBER } from './big_number';
import { CARD } from './card';
import { FUNNEL } from './funnel';
import { GUIDED } from './guided';
import { HEATMAP } from './heatmap';
import { LIMITS } from './limits';
import { LINES } from './lines';
import { MIXED } from './mixed';
import { PIE } from './pie';
import { PIVOT } from './pivot';
import { TABLES } from './table';

export const GROUPS: Group[] = [BARS, LINES, TABLES, PIE, BIG_NUMBER, CARD, PIVOT, HEATMAP, MIXED, FUNNEL, GUIDED, LIMITS];
