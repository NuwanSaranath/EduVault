import {
  ATOMIC_RADIUS_PM,
  AUFBAU_ANOMALIES,
  ELECTRON_AFFINITY_KJ,
  ELECTRONEGATIVITY,
  ELEMENTS,
  FIRST_IONISATION_KJ,
  MAX_GROUP,
  MAX_PERIOD,
} from '../periodicTable';

/**
 * The periodic data drives two animations that teach *trends*, so a single
 * mistyped value does not crash anything — it silently draws the wrong science.
 * A student would see, say, chlorine larger than sodium and have no way to know
 * the app was wrong rather than their understanding.
 *
 * These assertions encode the trends themselves, so the data cannot drift away
 * from what the lesson teaches.
 */
describe('element table', () => {
  it('has unique atomic numbers', () => {
    const zs = ELEMENTS.map((e) => e.z);
    expect(new Set(zs).size).toBe(zs.length);
  });

  it('has unique symbols', () => {
    const symbols = ELEMENTS.map((e) => e.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('runs from hydrogen with no gaps', () => {
    const zs = ELEMENTS.map((e) => e.z).sort((a, b) => a - b);
    expect(zs[0]).toBe(1);
    for (let i = 1; i < zs.length; i += 1) {
      expect(zs[i]).toBe(zs[i - 1] + 1);
    }
  });

  it('keeps every element inside the drawn grid', () => {
    // Out-of-range coordinates would place a cell off-canvas, invisibly.
    for (const element of ELEMENTS) {
      expect(element.group).toBeGreaterThanOrEqual(1);
      expect(element.group).toBeLessThanOrEqual(MAX_GROUP);
      expect(element.period).toBeGreaterThanOrEqual(1);
      expect(element.period).toBeLessThanOrEqual(MAX_PERIOD);
    }
  });

  it('never places two elements in the same cell', () => {
    const cells = ELEMENTS.map((e) => `${e.group}:${e.period}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('assigns blocks to the right groups', () => {
    // The block structure is what the table-building animation teaches, so it
    // has to match the group ranges it draws.
    //
    // Helium is the one real exception and is checked separately below: it is
    // 1s², so s-block, but it is drawn in group 18 with the other noble gases.
    for (const element of ELEMENTS) {
      if (element.symbol === 'He') continue;
      if (element.block === 's') expect(element.group).toBeLessThanOrEqual(2);
      if (element.block === 'd') {
        expect(element.group).toBeGreaterThanOrEqual(3);
        expect(element.group).toBeLessThanOrEqual(12);
      }
      if (element.block === 'p') expect(element.group).toBeGreaterThanOrEqual(13);
    }
  });

  it('treats helium as an s-block element despite sitting in group 18', () => {
    // A classic exam point: He is 1s², so it is s-block even though it is drawn
    // with the noble gases.
    const he = ELEMENTS.find((e) => e.symbol === 'He')!;
    expect(he.block).toBe('s');
    expect(he.group).toBe(18);
  });

  it('has no d-block before period 4', () => {
    // Because 4s fills before 3d — the fact the Aufbau animation depends on.
    const early = ELEMENTS.filter((e) => e.block === 'd' && e.period < 4);
    expect(early).toEqual([]);
  });
});

describe('atomic radius trend', () => {
  const radiusOf = (symbol: string) =>
    ATOMIC_RADIUS_PM[ELEMENTS.find((e) => e.symbol === symbol)!.z];

  it('decreases across a period', () => {
    expect(radiusOf('Na')).toBeGreaterThan(radiusOf('Mg'));
    expect(radiusOf('Mg')).toBeGreaterThan(radiusOf('Si'));
    expect(radiusOf('Si')).toBeGreaterThan(radiusOf('Cl'));
  });

  it('increases down a group', () => {
    expect(radiusOf('Na')).toBeGreaterThan(radiusOf('Li'));
    expect(radiusOf('K')).toBeGreaterThan(radiusOf('Na'));
  });

  it('has a value for every element drawn', () => {
    const missing = ELEMENTS.filter((e) => ATOMIC_RADIUS_PM[e.z] === undefined);
    expect(missing.map((e) => e.symbol)).toEqual([]);
  });
});

describe('ionisation energy trend', () => {
  const ieOf = (symbol: string) =>
    FIRST_IONISATION_KJ[ELEMENTS.find((e) => e.symbol === symbol)!.z];

  it('increases across a period', () => {
    expect(ieOf('Ar')).toBeGreaterThan(ieOf('Na'));
    expect(ieOf('Ne')).toBeGreaterThan(ieOf('Li'));
  });

  it('decreases down a group', () => {
    expect(ieOf('Li')).toBeGreaterThan(ieOf('Na'));
    expect(ieOf('Na')).toBeGreaterThan(ieOf('K'));
  });

  it('runs opposite to atomic radius, which is the point of the pairing', () => {
    const li = ELEMENTS.find((e) => e.symbol === 'Li')!.z;
    const f = ELEMENTS.find((e) => e.symbol === 'F')!.z;
    expect(ATOMIC_RADIUS_PM[li]).toBeGreaterThan(ATOMIC_RADIUS_PM[f]);
    expect(FIRST_IONISATION_KJ[li]).toBeLessThan(FIRST_IONISATION_KJ[f]);
  });

  it('has a value for every element drawn', () => {
    const missing = ELEMENTS.filter((e) => FIRST_IONISATION_KJ[e.z] === undefined);
    expect(missing.map((e) => e.symbol)).toEqual([]);
  });
});

describe('electronegativity', () => {
  it('peaks at fluorine', () => {
    const max = Math.max(...Object.values(ELECTRONEGATIVITY));
    const f = ELEMENTS.find((e) => e.symbol === 'F')!.z;
    expect(ELECTRONEGATIVITY[f]).toBe(max);
    expect(ELECTRONEGATIVITY[f]).toBeCloseTo(3.98, 2);
  });

  it('omits the noble gases rather than inventing values', () => {
    // The gap is real chemistry and the animation calls attention to it.
    for (const symbol of ['He', 'Ne', 'Ar', 'Kr']) {
      const z = ELEMENTS.find((e) => e.symbol === symbol)!.z;
      expect(ELECTRONEGATIVITY[z]).toBeUndefined();
    }
  });

  it('increases across a period and decreases down a group', () => {
    const at = (symbol: string) =>
      ELECTRONEGATIVITY[ELEMENTS.find((e) => e.symbol === symbol)!.z];
    expect(at('F')).toBeGreaterThan(at('Li'));
    expect(at('Li')).toBeGreaterThan(at('Na'));
  });
});

describe('electron affinity', () => {
  it('peaks in the halogens', () => {
    const cl = ELEMENTS.find((e) => e.symbol === 'Cl')!.z;
    const max = Math.max(...Object.values(ELECTRON_AFFINITY_KJ));
    expect(ELECTRON_AFFINITY_KJ[cl]).toBe(max);
  });

  it('omits group 2 and the noble gases', () => {
    for (const symbol of ['Be', 'Mg', 'Ca', 'Ne', 'Ar']) {
      const z = ELEMENTS.find((e) => e.symbol === symbol)!.z;
      expect(ELECTRON_AFFINITY_KJ[z]).toBeUndefined();
    }
  });
});

describe('Aufbau anomalies', () => {
  it('lists Cr and Cu', () => {
    expect(AUFBAU_ANOMALIES.map((a) => a.symbol)).toEqual(['Cr', 'Cu']);
  });

  it('gives an expected and an actual configuration that differ', () => {
    for (const anomaly of AUFBAU_ANOMALIES) {
      expect(anomaly.expected).not.toBe(anomaly.actual);
      expect(anomaly.reasonSi.trim().length).toBeGreaterThan(0);
    }
  });

  it('moves an electron into d in both cases, leaving 4s¹', () => {
    // The shared mechanism: a half-full or full d subshell is worth borrowing
    // from 4s for. Both entries must show that, or the animation's caption lies.
    for (const anomaly of AUFBAU_ANOMALIES) {
      expect(anomaly.actual).toContain('4s¹');
      expect(anomaly.expected).toContain('4s²');
    }
  });
});
