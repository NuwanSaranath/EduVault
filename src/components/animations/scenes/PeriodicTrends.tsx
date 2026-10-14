import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import {
  ATOMIC_RADIUS_PM,
  ELECTRON_AFFINITY_KJ,
  ELECTRONEGATIVITY,
  ELEMENTS,
  FIRST_IONISATION_KJ,
  MAX_GROUP,
  MAX_PERIOD,
} from '@/features/animation/periodicTable';
import type { SceneProps } from '@/features/animation/types';
import { clamp, easeOut, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.6 — ආවර්තීය නැඹුරුතා (Periodic trends).
 *
 * Four trends are usually taught as four separate things to memorise, in four
 * separate diagrams. They are not four things. **One cause — effective nuclear
 * charge rising across a period, and shell count rising down a group — produces
 * all four**, which is why three of them point the same way and radius points
 * the opposite way.
 *
 * So this is deliberately *one* table with four overlays swapped in place. The
 * table never moves, only the data on it, which makes the comparison direct:
 * the student sees radius shrinking toward the top right, then immediately sees
 * ionisation energy growing toward the same corner. Two diagrams side by side
 * cannot force that.
 *
 * Every value is real, from `periodicTable.ts`, so the gaps are real too —
 * noble gases have no electronegativity value and group 2 has no useful electron
 * affinity, and those absences are themselves examinable.
 */

interface Trend {
  id: string;
  titleSi: string;
  data: Record<number, number>;
  /** High values are drawn hot. Radius inverts so 'large' still reads strongly. */
  invert: boolean;
  colour: string;
  /** Direction arrows: does it increase left→right and top→bottom? */
  acrossIncreases: boolean;
  downIncreases: boolean;
  at: number;
  reasonSi: string;
}

const TRENDS: Trend[] = [
  {
    id: 'radius',
    titleSi: 'පරමාණුක අරය',
    data: ATOMIC_RADIUS_PM,
    invert: true,
    colour: '#3B82F6',
    acrossIncreases: false,
    downIncreases: true,
    at: 3,
    reasonSi: 'Z_eff වැඩි වේ → එකම කවචය ඇදේ · පහළට නව කවච එකතු වේ',
  },
  {
    id: 'ionisation',
    titleSi: 'අයනීකරණ ශක්තිය',
    data: FIRST_IONISATION_KJ,
    invert: false,
    colour: '#F59E0B',
    acrossIncreases: true,
    downIncreases: false,
    at: 10,
    reasonSi: 'කුඩා පරමාණුවක ඉලෙක්ට්‍රෝනය තදින් බැඳී ඇත → ඉවත් කිරීම අපහසුයි',
  },
  {
    id: 'affinity',
    titleSi: 'ඉලෙක්ට්‍රෝන ලබා ගැනීමේ ශක්තිය',
    data: ELECTRON_AFFINITY_KJ,
    invert: false,
    colour: '#22C55E',
    acrossIncreases: true,
    downIncreases: false,
    at: 17,
    reasonSi: 'හිස් තැනක් ඇති, කුඩා පරමාණු ඉලෙක්ට්‍රෝනයක් තදින් ඇද ගනී',
  },
  {
    id: 'electronegativity',
    titleSi: 'විද්‍යුත්-සෘණතාව',
    data: ELECTRONEGATIVITY,
    invert: false,
    colour: '#EF4444',
    acrossIncreases: true,
    downIncreases: false,
    at: 22,
    reasonSi: 'F උපරිමයයි (3.98) — කුඩා ම සහ වැඩි ම Z_eff සංයෝජනය',
  },
];

export function PeriodicTrends({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const cell = Math.min((width * 0.88) / MAX_GROUP, (height * 0.46) / MAX_PERIOD);
    return {
      cell,
      left: (width - cell * MAX_GROUP) / 2,
      top: height * 0.24,
    };
  }, [width, height]);

  const time = reduceMotion ? 26 : t;

  const gridIn = easeOut(segment(time, 0, 1.6));
  const conclusionIn = easeOut(segment(time, 26, 27.4));

  const xOf = (group: number) => geo.left + (group - 1) * geo.cell;
  const yOf = (period: number) => geo.top + (period - 1) * geo.cell;

  const trend = TRENDS.reduce<Trend | null>((acc, k) => (time >= k.at ? k : acc), null);

  /** Normalises a trend's values to 0..1 across the elements that have one. */
  const range = useMemo(() => {
    if (!trend) return null;
    const values = Object.values(trend.data);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [trend]);

  /** How far into the current trend's reveal we are. */
  const trendIn = trend ? easeOut(segment(time, trend.at, trend.at + 1.4)) : 0;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── The table, which never moves ─────────────────────────────────── */}
        <G opacity={gridIn}>
          {ELEMENTS.map((element) => (
            <Rect
              key={element.z}
              x={xOf(element.group) + 0.5}
              y={yOf(element.period) + 0.5}
              width={geo.cell - 1}
              height={geo.cell - 1}
              rx={2}
              stroke={c.grid}
              strokeWidth={1}
              fill="none"
            />
          ))}
        </G>

        {/* ── The active trend ─────────────────────────────────────────────── */}
        {trend && range
          ? ELEMENTS.map((element) => {
              const value = trend.data[element.z];
              // No value is a real fact about the element, so the cell is left
              // empty rather than filled with a guess.
              if (value === undefined) return null;

              const norm = clamp((value - range.min) / (range.max - range.min));
              const strength = trend.invert ? norm : norm;

              if (trend.id === 'radius') {
                // Radius is shown as size, which is what it physically is.
                const r = (geo.cell * 0.46) * (0.3 + 0.7 * norm) * trendIn;
                return (
                  <Circle
                    key={`v-${element.z}`}
                    cx={xOf(element.group) + geo.cell / 2}
                    cy={yOf(element.period) + geo.cell / 2}
                    r={r}
                    fill={trend.colour}
                    opacity={0.72}
                  />
                );
              }

              // The others are magnitudes, so they are shown as intensity.
              return (
                <Rect
                  key={`v-${element.z}`}
                  x={xOf(element.group) + 1}
                  y={yOf(element.period) + 1}
                  width={geo.cell - 2}
                  height={geo.cell - 2}
                  rx={2}
                  fill={trend.colour}
                  opacity={(0.12 + 0.8 * strength) * trendIn}
                />
              );
            })
          : null}

        {/* Fluorine highlighted on the electronegativity pass. */}
        {trend?.id === 'electronegativity' ? (
          <Rect
            x={xOf(17) - 1}
            y={yOf(2) - 1}
            width={geo.cell + 2}
            height={geo.cell + 2}
            rx={3}
            stroke={c.labelStrong}
            strokeWidth={2.2}
            fill="none"
            opacity={easeOut(segment(time, trend.at + 1.6, trend.at + 2.4))}
          />
        ) : null}

        {/* ── Direction arrows, redrawn per trend ──────────────────────────── */}
        {trend ? (
          <G opacity={trendIn}>
            {/* Across a period */}
            <Line
              x1={geo.left}
              y1={geo.top - 16}
              x2={geo.left + geo.cell * MAX_GROUP}
              y2={geo.top - 16}
              stroke={trend.colour}
              strokeWidth={1.6}
            />
            <Path
              d={
                trend.acrossIncreases
                  ? `M ${geo.left + geo.cell * MAX_GROUP - 7} ${geo.top - 20}
                     L ${geo.left + geo.cell * MAX_GROUP} ${geo.top - 16}
                     L ${geo.left + geo.cell * MAX_GROUP - 7} ${geo.top - 12}`
                  : `M ${geo.left + 7} ${geo.top - 20} L ${geo.left} ${geo.top - 16}
                     L ${geo.left + 7} ${geo.top - 12}`
              }
              stroke={trend.colour}
              strokeWidth={1.6}
              fill="none"
            />

            {/* Down a group */}
            <Line
              x1={geo.left - 14}
              y1={geo.top}
              x2={geo.left - 14}
              y2={geo.top + geo.cell * MAX_PERIOD}
              stroke={trend.colour}
              strokeWidth={1.6}
            />
            <Path
              d={
                trend.downIncreases
                  ? `M ${geo.left - 18} ${geo.top + geo.cell * MAX_PERIOD - 7}
                     L ${geo.left - 14} ${geo.top + geo.cell * MAX_PERIOD}
                     L ${geo.left - 10} ${geo.top + geo.cell * MAX_PERIOD - 7}`
                  : `M ${geo.left - 18} ${geo.top + 7} L ${geo.left - 14} ${geo.top}
                     L ${geo.left - 10} ${geo.top + 7}`
              }
              stroke={trend.colour}
              strokeWidth={1.6}
              fill="none"
            />
          </G>
        ) : null}
      </Svg>

      {/* ── Element symbols, always visible so the table stays readable ──── */}
      {geo.cell >= 15
        ? ELEMENTS.map((element) => (
            <SceneLabel
              key={`s-${element.z}`}
              x={xOf(element.group) + geo.cell / 2}
              y={yOf(element.period) + geo.cell / 2 - 5}
              text={element.symbol}
              color={c.labelStrong}
              opacity={gridIn * 0.95}
              size={Math.min(8, geo.cell * 0.38)}
              bold
              maxWidth={geo.cell}
            />
          ))
        : null}

      <SceneLabel
        x={width * 0.5}
        y={height * 0.045}
        text={trend ? trend.titleSi : 'ආවර්තීය නැඹුරුතා'}
        color={trend ? trend.colour : c.labelStrong}
        opacity={gridIn}
        size={13}
        bold
        maxWidth={width * 0.94}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.12}
        text={trend ? trend.reasonSi : 'එකම හේතුවෙන් නැඹුරුතා හතරක්'}
        color={c.label}
        opacity={trend ? trendIn : gridIn}
        size={10}
        maxWidth={width * 0.94}
      />

      <SceneLabel
        x={width * 0.5}
        y={height * 0.88}
        text={
          'හේතුව එකයි: Z_eff (ආවර්තයක් දිගේ වැඩි වේ) සහ කවච ගණන (කාණ්ඩයක් දිගේ වැඩි වේ).\n' +
          'අරය පමණක් විරුද්ධ දිශාවට යන්නේ ඒ නිසයි.'
        }
        color={c.labelStrong}
        opacity={conclusionIn}
        size={11}
        bold
        maxWidth={width * 0.96}
      />
    </View>
  );
}
