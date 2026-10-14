import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { easeOut, pulse, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.3 / §1.6 — අනුක්‍රමික අයනීකරණ ශක්ති (Successive ionisation energies).
 *
 * A data-reading skill rather than a fact to recall: given a table of successive
 * ionisation energies, identify the element's group. Exam questions supply the
 * numbers, so what has to be learned is *where to look* — and the answer is the
 * one enormous gap, which is where the next electron has to come from a complete
 * inner shell.
 *
 * Three elements run in turn with the jump one place further along each time.
 * Seeing it move from after the 1st, to the 2nd, to the 3rd is what turns it
 * from a coincidence into a rule.
 *
 * **Log scale, stated on screen.** Na's 8th ionisation energy is fifty times its
 * first; on a linear axis the first bar is invisible and the jump disappears
 * into the general upward slope. The log axis is the only way the *step* reads
 * as a step — and knowing why the axis is logarithmic is itself examinable.
 */

interface Case {
  symbol: string;
  nameSi: string;
  /** Successive ionisation energies in kJ mol⁻¹. */
  energies: number[];
  /** 1-based position after which the big jump occurs = valence electrons. */
  jumpAfter: number;
  group: string;
  at: number;
}

const CASES: Case[] = [
  {
    symbol: 'Na',
    nameSi: 'සෝඩියම්',
    energies: [496, 4562, 6910, 9543, 13354, 16613, 20117, 25496],
    jumpAfter: 1,
    group: 'කාණ්ඩය 1',
    at: 2.4,
  },
  {
    symbol: 'Mg',
    nameSi: 'මැග්නීසියම්',
    energies: [738, 1451, 7733, 10540, 13630, 18020, 21711, 25661],
    jumpAfter: 2,
    group: 'කාණ්ඩය 2',
    at: 8,
  },
  {
    symbol: 'Al',
    nameSi: 'ඇලුමිනියම්',
    energies: [578, 1817, 2745, 11577, 14842, 18379, 23326, 27465],
    jumpAfter: 3,
    group: 'කාණ්ඩය 13',
    at: 13,
  },
];

const LOG_MIN = Math.log10(300);
const LOG_MAX = Math.log10(30000);

export function IonisationJump({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const plotLeft = width * 0.12;
    const plotRight = width * 0.95;
    return {
      plotLeft,
      plotRight,
      plotWidth: plotRight - plotLeft,
      baseline: height * 0.76,
      plotTop: height * 0.16,
    };
  }, [width, height]);

  const time = reduceMotion ? 16.5 : t;

  const axesIn = easeOut(segment(time, 0, 1.4));
  const summaryIn = easeOut(segment(time, 16.4, 17.6));

  /** The case currently on screen. */
  const active = CASES.reduce<Case | null>((acc, k) => (time >= k.at ? k : acc), null);

  const yOfEnergy = (kj: number): number => {
    const frac = (Math.log10(kj) - LOG_MIN) / (LOG_MAX - LOG_MIN);
    return geo.baseline - frac * (geo.baseline - geo.plotTop);
  };

  const barSlot = active ? geo.plotWidth / active.energies.length : 0;
  const barW = barSlot * 0.56;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── Log gridlines ────────────────────────────────────────────────── */}
        <G opacity={axesIn}>
          {[1000, 10000].map((v) => (
            <Line
              key={v}
              x1={geo.plotLeft}
              y1={yOfEnergy(v)}
              x2={geo.plotRight}
              y2={yOfEnergy(v)}
              stroke={c.grid}
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          ))}
          <Line
            x1={geo.plotLeft}
            y1={geo.baseline}
            x2={geo.plotRight}
            y2={geo.baseline}
            stroke={c.axis}
            strokeWidth={1.5}
          />
          <Line
            x1={geo.plotLeft}
            y1={geo.baseline}
            x2={geo.plotLeft}
            y2={geo.plotTop - 4}
            stroke={c.axis}
            strokeWidth={1.5}
          />
        </G>

        {/* ── Bars ─────────────────────────────────────────────────────────── */}
        {active
          ? active.energies.map((kj, i) => {
              const grow = easeOut(segment(time, active.at + 0.4 + i * 0.28, active.at + 1.0 + i * 0.28));
              if (grow <= 0) return null;

              const top = yOfEnergy(kj);
              const fullH = geo.baseline - top;
              const x = geo.plotLeft + i * barSlot + (barSlot - barW) / 2;

              // Bars at and after the jump are tinted, so the boundary between
              // valence and core electrons is a visible colour change too.
              const isCore = i + 1 > active.jumpAfter;

              return (
                <Rect
                  key={i}
                  x={x}
                  y={geo.baseline - fullH * grow}
                  width={barW}
                  height={fullH * grow}
                  rx={2}
                  fill={isCore ? c.muted : c.highlight}
                  opacity={isCore ? 0.75 : 0.95}
                />
              );
            })
          : null}

        {/* ── The jump marker ──────────────────────────────────────────────── */}
        {active
          ? (() => {
              const markerIn = easeOut(
                segment(time, active.at + 0.4 + active.jumpAfter * 0.28 + 0.7, active.at + 2.2 + active.jumpAfter * 0.28),
              );
              if (markerIn <= 0) return null;

              const x = geo.plotLeft + active.jumpAfter * barSlot;
              const yFrom = yOfEnergy(active.energies[active.jumpAfter - 1]);
              const yTo = yOfEnergy(active.energies[active.jumpAfter]);

              return (
                <G opacity={markerIn * (0.65 + pulse(time, active.at + 2, active.at + 4) * 0.35)}>
                  {/* The boundary between valence and core. */}
                  <Line
                    x1={x}
                    y1={geo.plotTop - 4}
                    x2={x}
                    y2={geo.baseline}
                    stroke={c.danger}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  {/* The jump itself, as a measured rise. */}
                  <Line
                    x1={x + barSlot * 0.5}
                    y1={yFrom}
                    x2={x + barSlot * 0.5}
                    y2={yTo}
                    stroke={c.danger}
                    strokeWidth={2.4}
                  />
                  <Path
                    d={`M ${x + barSlot * 0.5 - 5} ${yTo + 9} L ${x + barSlot * 0.5} ${yTo}
                        L ${x + barSlot * 0.5 + 5} ${yTo + 9}`}
                    stroke={c.danger}
                    strokeWidth={2.4}
                    fill="none"
                  />
                </G>
              );
            })()
          : null}
      </Svg>

      {/* ── Labels ───────────────────────────────────────────────────────── */}
      <SceneLabel
        x={geo.plotLeft - 8}
        y={yOfEnergy(1000) - 7}
        text="10³"
        color={c.label}
        opacity={axesIn}
        size={9}
        anchor="end"
        maxWidth={40}
      />
      <SceneLabel
        x={geo.plotLeft - 8}
        y={yOfEnergy(10000) - 7}
        text="10⁴"
        color={c.label}
        opacity={axesIn}
        size={9}
        anchor="end"
        maxWidth={40}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.045}
        text="අනුක්‍රමික අයනීකරණ ශක්තිය  (kJ mol⁻¹, log පරිමාණය)"
        color={c.label}
        opacity={axesIn}
        size={10}
        maxWidth={width * 0.92}
      />
      <SceneLabel
        x={width * 0.5}
        y={geo.baseline + 6}
        text="ඉවත් කරන ඉලෙක්ට්‍රෝනයේ අංකය →"
        color={c.label}
        opacity={axesIn}
        size={9}
        maxWidth={width * 0.7}
      />

      {active ? (
        <>
          <SceneLabel
            x={geo.plotLeft + 4}
            y={height * 0.045}
            text={`${active.symbol} — ${active.nameSi}`}
            color={c.labelStrong}
            opacity={1}
            size={13}
            bold
            anchor="start"
            maxWidth={width * 0.4}
          />
          <SceneLabel
            x={width * 0.5}
            y={geo.baseline + 26}
            text={`පිම්ම ${active.jumpAfter} වැන්නෙන් පසු → සංයුජතා ඉලෙක්ට්‍රෝන ${active.jumpAfter} → ${active.group}`}
            color={c.danger}
            opacity={easeOut(
              segment(time, active.at + 1.4 + active.jumpAfter * 0.28, active.at + 2.6 + active.jumpAfter * 0.28),
            ) * (1 - summaryIn)}
            size={11}
            bold
            maxWidth={width * 0.94}
          />
        </>
      ) : null}

      <SceneLabel
        x={width * 0.5}
        y={geo.baseline + 22}
        text={
          'Na → 1 · Mg → 2 · Al → 3\n' +
          'පිම්මට පෙර ඇති බාර් ගණන = සංයුජතා ඉලෙක්ට්‍රෝන ගණන = කාණ්ඩය'
        }
        color={c.labelStrong}
        opacity={summaryIn}
        size={11}
        bold
        maxWidth={width * 0.94}
      />
    </View>
  );
}
