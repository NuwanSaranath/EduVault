/**
 * A compact periodic table, laid out for drawing.
 *
 * Shared by the table-building and periodic-trend scenes so both animations
 * place an element in exactly the same cell. If they each carried their own
 * coordinates, a student comparing the two would see Na move between them.
 *
 * Covers Z = 1–36 (through Kr), which is enough to show s, p and d blocks in
 * their real positions; the f-block is drawn as a detached strip because that is
 * how it appears in a printed table and the *reason* it is detached is part of
 * what the building animation teaches.
 */

export type Block = 's' | 'p' | 'd' | 'f';

export interface Element {
  z: number;
  symbol: string;
  /** 1–18, as printed on the table. */
  group: number;
  period: number;
  block: Block;
}

/**
 * Groups are the printed 1–18 numbering, so group 1 and group 18 sit at the two
 * edges and the d-block occupies 3–12. That is what produces the table's
 * characteristic gap in periods 2 and 3.
 */
export const ELEMENTS: Element[] = [
  // Period 1
  { z: 1, symbol: 'H', group: 1, period: 1, block: 's' },
  { z: 2, symbol: 'He', group: 18, period: 1, block: 's' },

  // Period 2
  { z: 3, symbol: 'Li', group: 1, period: 2, block: 's' },
  { z: 4, symbol: 'Be', group: 2, period: 2, block: 's' },
  { z: 5, symbol: 'B', group: 13, period: 2, block: 'p' },
  { z: 6, symbol: 'C', group: 14, period: 2, block: 'p' },
  { z: 7, symbol: 'N', group: 15, period: 2, block: 'p' },
  { z: 8, symbol: 'O', group: 16, period: 2, block: 'p' },
  { z: 9, symbol: 'F', group: 17, period: 2, block: 'p' },
  { z: 10, symbol: 'Ne', group: 18, period: 2, block: 'p' },

  // Period 3
  { z: 11, symbol: 'Na', group: 1, period: 3, block: 's' },
  { z: 12, symbol: 'Mg', group: 2, period: 3, block: 's' },
  { z: 13, symbol: 'Al', group: 13, period: 3, block: 'p' },
  { z: 14, symbol: 'Si', group: 14, period: 3, block: 'p' },
  { z: 15, symbol: 'P', group: 15, period: 3, block: 'p' },
  { z: 16, symbol: 'S', group: 16, period: 3, block: 'p' },
  { z: 17, symbol: 'Cl', group: 17, period: 3, block: 'p' },
  { z: 18, symbol: 'Ar', group: 18, period: 3, block: 'p' },

  // Period 4 — the first period with a d-block, which is the point
  { z: 19, symbol: 'K', group: 1, period: 4, block: 's' },
  { z: 20, symbol: 'Ca', group: 2, period: 4, block: 's' },
  { z: 21, symbol: 'Sc', group: 3, period: 4, block: 'd' },
  { z: 22, symbol: 'Ti', group: 4, period: 4, block: 'd' },
  { z: 23, symbol: 'V', group: 5, period: 4, block: 'd' },
  { z: 24, symbol: 'Cr', group: 6, period: 4, block: 'd' },
  { z: 25, symbol: 'Mn', group: 7, period: 4, block: 'd' },
  { z: 26, symbol: 'Fe', group: 8, period: 4, block: 'd' },
  { z: 27, symbol: 'Co', group: 9, period: 4, block: 'd' },
  { z: 28, symbol: 'Ni', group: 10, period: 4, block: 'd' },
  { z: 29, symbol: 'Cu', group: 11, period: 4, block: 'd' },
  { z: 30, symbol: 'Zn', group: 12, period: 4, block: 'd' },
  { z: 31, symbol: 'Ga', group: 13, period: 4, block: 'p' },
  { z: 32, symbol: 'Ge', group: 14, period: 4, block: 'p' },
  { z: 33, symbol: 'As', group: 15, period: 4, block: 'p' },
  { z: 34, symbol: 'Se', group: 16, period: 4, block: 'p' },
  { z: 35, symbol: 'Br', group: 17, period: 4, block: 'p' },
  { z: 36, symbol: 'Kr', group: 18, period: 4, block: 'p' },
];

export const MAX_GROUP = 18;
export const MAX_PERIOD = 4;

/** Order in which blocks are revealed — the Aufbau order, not left to right. */
export const BLOCK_ORDER: Block[] = ['s', 'p', 'd', 'f'];

export const BLOCK_LABEL_SI: Record<Block, string> = {
  s: 's ගොනුව',
  p: 'p ගොනුව',
  d: 'd ගොනුව',
  f: 'f ගොනුව',
};

/**
 * Relative atomic radius, 0..1, normalised across the elements drawn.
 *
 * Real values in pm, scaled at draw time. Two facts have to survive the
 * normalisation or the trend animation teaches the wrong thing: radius *shrinks*
 * left → right across a period (increasing Z_eff pulls the same shell in), and
 * *grows* top → bottom down a group (a whole new shell). Noble gases are
 * deliberately included so the period-end drop is visible.
 */
export const ATOMIC_RADIUS_PM: Record<number, number> = {
  1: 53, 2: 31,
  3: 167, 4: 112, 5: 87, 6: 67, 7: 56, 8: 48, 9: 42, 10: 38,
  11: 190, 12: 145, 13: 118, 14: 111, 15: 98, 16: 88, 17: 79, 18: 71,
  19: 243, 20: 194, 21: 184, 22: 176, 23: 171, 24: 166, 25: 161, 26: 156,
  27: 152, 28: 149, 29: 145, 30: 142, 31: 136, 32: 125, 33: 114, 34: 103,
  35: 94, 36: 88,
};

/** First ionisation energy in kJ mol⁻¹. Trend is the inverse of radius. */
export const FIRST_IONISATION_KJ: Record<number, number> = {
  1: 1312, 2: 2372,
  3: 520, 4: 899, 5: 801, 6: 1086, 7: 1402, 8: 1314, 9: 1681, 10: 2081,
  11: 496, 12: 738, 13: 578, 14: 787, 15: 1012, 16: 1000, 17: 1251, 18: 1521,
  19: 419, 20: 590, 21: 633, 22: 659, 23: 651, 24: 653, 25: 717, 26: 762,
  27: 760, 28: 737, 29: 745, 30: 906, 31: 579, 32: 762, 33: 947, 34: 941,
  35: 1140, 36: 1351,
};

/** Pauling electronegativity. Noble gases omitted — they have no accepted value. */
export const ELECTRONEGATIVITY: Record<number, number> = {
  1: 2.2,
  3: 0.98, 4: 1.57, 5: 2.04, 6: 2.55, 7: 3.04, 8: 3.44, 9: 3.98,
  11: 0.93, 12: 1.31, 13: 1.61, 14: 1.9, 15: 2.19, 16: 2.58, 17: 3.16,
  19: 0.82, 20: 1.0, 21: 1.36, 22: 1.54, 23: 1.63, 24: 1.66, 25: 1.55,
  26: 1.83, 27: 1.88, 28: 1.91, 29: 1.9, 30: 1.65, 31: 1.81, 32: 2.01,
  33: 2.18, 34: 2.55, 35: 2.96,
};

/**
 * Electron affinity in kJ mol⁻¹ (magnitude of energy released).
 *
 * Only the elements with a clear, positive value are listed. Group 2 and the
 * noble gases are absent on purpose: their affinities are near zero or
 * endothermic, and the *gaps* in the trend are themselves examinable.
 */
export const ELECTRON_AFFINITY_KJ: Record<number, number> = {
  1: 73,
  3: 60, 5: 27, 6: 122, 8: 141, 9: 328,
  11: 53, 13: 42, 14: 134, 15: 72, 16: 200, 17: 349,
  19: 48, 31: 29, 32: 119, 33: 78, 34: 195, 35: 325,
};

/** Elements that break the simple Aufbau order, with the reason to display. */
export const AUFBAU_ANOMALIES: Array<{
  symbol: string;
  expected: string;
  actual: string;
  reasonSi: string;
}> = [
  {
    symbol: 'Cr',
    expected: '[Ar] 3d⁴ 4s²',
    actual: '[Ar] 3d⁵ 4s¹',
    reasonSi: 'අර්ධ පිරුණු 3d⁵ වඩාත් ස්ථායීයි',
  },
  {
    symbol: 'Cu',
    expected: '[Ar] 3d⁹ 4s²',
    actual: '[Ar] 3d¹⁰ 4s¹',
    reasonSi: 'සම්පූර්ණ පිරුණු 3d¹⁰ වඩාත් ස්ථායීයි',
  },
];
