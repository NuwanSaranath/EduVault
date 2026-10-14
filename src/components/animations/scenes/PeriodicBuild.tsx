import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import {
  BLOCK_LABEL_SI,
  ELEMENTS,
  MAX_GROUP,
  MAX_PERIOD,
  type Block,
} from '@/features/animation/periodicTable';
import type { SceneProps } from '@/features/animation/types';
import { easeOut, segment, stagger } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.5 — ආවර්තිතා වගුව ගොඩනැගීම (Building the periodic table).
 *
 * The table is usually presented as a finished object whose shape has to be
 * accepted. Building it **block by block, in electron-configuration order**,
 * turns the shape into a consequence:
 *
 *   - the s-block is two columns wide because an s subshell holds 2 electrons
 *   - the p-block is six because p holds 6
 *   - the d-block is ten, and it appears *between* them — which is why periods 2
 *     and 3 have that famous gap, and why period 4 is suddenly much longer
 *   - the f-block is fourteen, and sits detached because inserting it would make
 *     the table unprintably wide
 *
 * Each block enters in its Aufbau position, so the same ordering that fills
 * orbitals in §1.4 is visibly the ordering that lays out the table.
 */

const BLOCK_COLOURS: Record<Block, string> = {
  s: '#3B82F6',
  p: '#22C55E',
  d: '#F59E0B',
  f: '#A855F7',
};

/** When each block starts appearing. */
const BLOCK_AT: Record<Block, number> = { s: 3, p: 9, d: 15, f: 21 };

export function PeriodicBuild({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const gridW = width * 0.94;
    const cell = Math.min(gridW / MAX_GROUP, (height * 0.52) / MAX_PERIOD);
    return {
      cell,
      left: (width - cell * MAX_GROUP) / 2,
      top: height * 0.17,
      fCellTop: height * 0.17 + cell * MAX_PERIOD + cell * 0.55,
    };
  }, [width, height]);

  const time = reduceMotion ? 24 : t;

  const gridIn = easeOut(segment(time, 0, 1.6));
  const conclusionIn = easeOut(segment(time, 24, 25.4));

  const xOf = (group: number) => geo.left + (group - 1) * geo.cell;
  const yOf = (period: number) => geo.top + (period - 1) * geo.cell;

  /** Elements grouped by block, so each block staggers within itself. */
  const byBlock = useMemo(() => {
    const map: Record<string, typeof ELEMENTS> = { s: [], p: [], d: [] };
    for (const element of ELEMENTS) {
      map[element.block].push(element);
    }
    return map;
  }, []);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── Empty grid: every cell an element will occupy ────────────────── */}
        <G opacity={gridIn * 0.5}>
          {ELEMENTS.map((element) => (
            <Rect
              key={`slot-${element.z}`}
              x={xOf(element.group) + 1}
              y={yOf(element.period) + 1}
              width={geo.cell - 2}
              height={geo.cell - 2}
              rx={2}
              stroke={c.grid}
              strokeWidth={1}
              fill="none"
            />
          ))}
          {/* The f-block strip, outlined from the start so its absence from the
              main body is noticed before it is explained. */}
          {Array.from({ length: 14 }, (_, i) => (
            <Rect
              key={`fslot-${i}`}
              x={geo.left + (i + 2) * geo.cell + 1}
              y={geo.fCellTop + 1}
              width={geo.cell - 2}
              height={geo.cell - 2}
              rx={2}
              stroke={c.grid}
              strokeWidth={1}
              strokeDasharray="2 3"
              fill="none"
            />
          ))}
        </G>

        {/* ── Blocks filling in Aufbau order ───────────────────────────────── */}
        {(['s', 'p', 'd'] as Block[]).map((block) => {
          const elements = byBlock[block];
          return (
            <G key={block}>
              {elements.map((element, i) => {
                const enter = stagger(
                  i,
                  elements.length,
                  time,
                  BLOCK_AT[block],
                  0.5,
                  0.86,
                );
                if (enter <= 0) return null;
                return (
                  <Rect
                    key={element.z}
                    x={xOf(element.group) + 1}
                    y={yOf(element.period) + 1}
                    width={(geo.cell - 2) * enter}
                    height={(geo.cell - 2) * enter}
                    rx={2}
                    fill={BLOCK_COLOURS[block]}
                    opacity={0.82 * enter}
                  />
                );
              })}
            </G>
          );
        })}

        {/* ── f-block: generic cells, since no f element is in the data set ── */}
        {Array.from({ length: 14 }, (_, i) => {
          const enter = stagger(i, 14, time, BLOCK_AT.f, 0.45, 0.86);
          if (enter <= 0) return null;
          return (
            <Rect
              key={`f-${i}`}
              x={geo.left + (i + 2) * geo.cell + 1}
              y={geo.fCellTop + 1}
              width={(geo.cell - 2) * enter}
              height={(geo.cell - 2) * enter}
              rx={2}
              fill={BLOCK_COLOURS.f}
              opacity={0.82 * enter}
            />
          );
        })}
      </Svg>

      {/* ── Element symbols ──────────────────────────────────────────────── */}
      {ELEMENTS.map((element, i) => {
        const elements = byBlock[element.block];
        const index = elements.findIndex((e) => e.z === element.z);
        const enter = stagger(index, elements.length, time, BLOCK_AT[element.block], 0.5, 0.86);
        if (enter < 0.7 || geo.cell < 16) return null;
        return (
          <SceneLabel
            key={`sym-${element.z}`}
            x={xOf(element.group) + geo.cell / 2}
            y={yOf(element.period) + geo.cell / 2 - 6}
            text={element.symbol}
            color="#FFFFFF"
            opacity={enter}
            size={Math.min(9, geo.cell * 0.42)}
            bold
            maxWidth={geo.cell}
          />
        );
      })}

      {/* ── Block callouts, each explaining its own width ────────────────── */}
      {(['s', 'p', 'd', 'f'] as Block[]).map((block) => {
        const shown =
          easeOut(segment(time, BLOCK_AT[block] + 0.4, BLOCK_AT[block] + 1.4)) *
          (1 - segment(time, BLOCK_AT[block] + 5, BLOCK_AT[block] + 5.8));
        const widthReason: Record<Block, string> = {
          s: 's උපකවචයේ ඉලෙක්ට්‍රෝන 2යි → තීරු 2යි',
          p: 'p උපකවචයේ ඉලෙක්ට්‍රෝන 6යි → තීරු 6යි',
          d: 'd උපකවචයේ ඉලෙක්ට්‍රෝන 10යි → තීරු 10යි, s සහ p අතරට',
          f: 'f උපකවචයේ ඉලෙක්ට්‍රෝන 14යි → වගුවට නොගැලපෙන නිසා පහළින්',
        };
        if (shown <= 0.01) return null;
        return (
          <SceneLabel
            key={`cal-${block}`}
            x={width * 0.5}
            y={height * 0.055}
            text={`${BLOCK_LABEL_SI[block]} — ${widthReason[block]}`}
            color={BLOCK_COLOURS[block]}
            opacity={shown}
            size={11}
            bold
            maxWidth={width * 0.94}
          />
        );
      })}

      <SceneLabel
        x={width * 0.5}
        y={height * 0.9}
        text="වගුවේ හැඩය ඉලෙක්ට්‍රෝන විනයාසයෙන් ම එයි — කාණ්ඩය = සංයුජතා ඉලෙක්ට්‍රෝන, ආවර්තය = කවචය"
        color={c.labelStrong}
        opacity={conclusionIn}
        size={11}
        bold
        maxWidth={width * 0.96}
      />
    </View>
  );
}
