import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { easeOut, segment, stagger } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.3.3 — ක්වොන්ටම් අංක (Quantum numbers) and the n² rule.
 *
 * From the lesson's image note: drawn as a tree, *"ඇයි n=2 ට කාක්ෂික 4ක්"*
 * becomes something a student can count rather than memorise. That is the whole
 * design goal here — the answer must be *countable on screen*.
 *
 * The tree is built from the rules rather than hard-coded, so the counts are
 * derived the same way the student would derive them:
 *
 *     l  = 0 … n−1                  (n values)
 *     mₗ = −l … +l                  (2l + 1 values per l)
 *     total orbitals = Σ (2l+1) = n²
 *
 * Each mₗ leaf is one orbital, so the leaves *are* the count. The n² figure
 * appears only at the end, after the student has already seen 1, 4 and 9 leaves.
 */

interface Branch {
  n: number;
  l: number;
  mValues: number[];
}

const SUBSHELL_LETTER = ['s', 'p', 'd', 'f'];

/** Builds the l and mₗ branches for a shell, straight from the rules. */
function branchesFor(n: number): Branch[] {
  return Array.from({ length: n }, (_, l) => ({
    n,
    l,
    mValues: Array.from({ length: 2 * l + 1 }, (_, i) => i - l),
  }));
}

const SHELLS = [1, 2, 3];

/** When each shell begins drawing. */
const SHELL_AT = [0.6, 5.2, 11.2];

export function QuantumTree({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const tree = useMemo(() => SHELLS.map((n) => branchesFor(n)), []);

  /** Total mₗ leaves across all shells: 1 + 4 + 9 = 14 rows to fit. */
  const totalLeaves = useMemo(
    () => tree.reduce((sum, branches) => sum + branches.reduce((s, b) => s + b.mValues.length, 0), 0),
    [tree],
  );

  const geo = useMemo(() => {
    const top = height * 0.1;
    const usable = height * 0.72;
    return {
      top,
      rowH: usable / totalLeaves,
      nX: width * 0.1,
      lX: width * 0.34,
      mX: width * 0.6,
      countX: width * 0.84,
    };
  }, [width, height, totalLeaves]);

  const time = reduceMotion ? 18 : t;
  const summaryIn = easeOut(segment(time, 17, 18.4));

  /** Row index where each shell's block starts, so blocks never overlap. */
  const shellOffsets = useMemo(() => {
    const offsets: number[] = [];
    let cursor = 0;
    for (const branches of tree) {
      offsets.push(cursor);
      cursor += branches.reduce((s, b) => s + b.mValues.length, 0);
    }
    return offsets;
  }, [tree]);

  const yOfRow = (row: number) => geo.top + (row + 0.5) * geo.rowH;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {tree.map((branches, shellIndex) => {
          const n = SHELLS[shellIndex];
          const shellStart = SHELL_AT[shellIndex];
          const shellIn = easeOut(segment(time, shellStart, shellStart + 0.8));
          if (shellIn <= 0) return null;

          const offset = shellOffsets[shellIndex];
          const leafCount = branches.reduce((s, b) => s + b.mValues.length, 0);
          const nY = yOfRow(offset + (leafCount - 1) / 2);

          let leafCursor = offset;

          return (
            <G key={n}>
              {/* n node */}
              <Circle cx={geo.nX} cy={nY} r={11} fill={c.highlight} opacity={shellIn} />

              {branches.map((branch, bi) => {
                const branchStart = shellStart + 0.9 + bi * 0.7;
                const branchIn = easeOut(segment(time, branchStart, branchStart + 0.6));
                const branchLeafStart = leafCursor;
                const lY = yOfRow(branchLeafStart + (branch.mValues.length - 1) / 2);
                leafCursor += branch.mValues.length;

                if (branchIn <= 0) return null;

                return (
                  <G key={`${n}-${branch.l}`}>
                    {/* n → l connector */}
                    <Path
                      d={`M ${geo.nX + 11} ${nY} C ${geo.nX + 40} ${nY}, ${geo.lX - 40} ${lY}, ${geo.lX - 9} ${lY}`}
                      stroke={c.axis}
                      strokeWidth={1.2}
                      fill="none"
                      opacity={branchIn * 0.8}
                    />
                    <Circle cx={geo.lX} cy={lY} r={9} fill={c.electron} opacity={branchIn} />

                    {branch.mValues.map((m, mi) => {
                      const leafRow = branchLeafStart + mi;
                      const mY = yOfRow(leafRow);
                      const leafIn = stagger(
                        mi,
                        branch.mValues.length,
                        time,
                        branchStart + 0.5,
                        0.4,
                        0.4,
                      );
                      if (leafIn <= 0) return null;

                      return (
                        <G key={`${n}-${branch.l}-${m}`} opacity={leafIn}>
                          <Path
                            d={`M ${geo.lX + 9} ${lY} C ${geo.lX + 30} ${lY}, ${geo.mX - 30} ${mY}, ${geo.mX - 7} ${mY}`}
                            stroke={c.axis}
                            strokeWidth={1}
                            fill="none"
                            opacity={0.7}
                          />
                          {/* Each leaf is one orbital — drawn as an empty box,
                              the same symbol the Aufbau animation fills in. */}
                          <Rect
                            x={geo.mX - 7}
                            y={mY - 7}
                            width={14}
                            height={14}
                            rx={3}
                            stroke={c.success}
                            strokeWidth={1.4}
                            fill="none"
                          />
                        </G>
                      );
                    })}
                  </G>
                );
              })}
            </G>
          );
        })}
      </Svg>

      {/* ── Labels ───────────────────────────────────────────────────────── */}
      <SceneLabel
        x={geo.nX}
        y={geo.top - 26}
        text="n"
        color={c.highlight}
        opacity={easeOut(segment(time, 0.4, 1.2))}
        size={12}
        bold
        maxWidth={40}
      />
      <SceneLabel
        x={geo.lX}
        y={geo.top - 26}
        text="l"
        color={c.electron}
        opacity={easeOut(segment(time, 0.4, 1.2))}
        size={12}
        bold
        maxWidth={40}
      />
      <SceneLabel
        x={geo.mX}
        y={geo.top - 26}
        text="mₗ"
        color={c.success}
        opacity={easeOut(segment(time, 0.4, 1.2))}
        size={12}
        bold
        maxWidth={40}
      />
      <SceneLabel
        x={geo.countX}
        y={geo.top - 26}
        text="කාක්ෂික"
        color={c.label}
        opacity={easeOut(segment(time, 0.4, 1.2))}
        size={10}
        bold
        maxWidth={70}
      />

      {tree.map((branches, shellIndex) => {
        const n = SHELLS[shellIndex];
        const shellStart = SHELL_AT[shellIndex];
        const shellIn = easeOut(segment(time, shellStart, shellStart + 0.8));
        const offset = shellOffsets[shellIndex];
        const leafCount = branches.reduce((s, b) => s + b.mValues.length, 0);
        const nY = yOfRow(offset + (leafCount - 1) / 2);

        // Count appears only after every leaf for this shell has landed.
        const countIn = easeOut(
          segment(time, shellStart + 0.9 + branches.length * 0.7 + 0.6, shellStart + branches.length * 0.7 + 2.2),
        );

        let leafCursor = offset;

        return (
          <View key={n}>
            <SceneLabel
              x={geo.nX}
              y={nY - 7}
              text={`${n}`}
              color="#FFFFFF"
              opacity={shellIn}
              size={11}
              bold
              maxWidth={26}
            />
            <SceneLabel
              x={geo.countX}
              y={nY - 9}
              text={`${leafCount}`}
              color={c.labelStrong}
              opacity={countIn}
              size={15}
              bold
              maxWidth={50}
            />

            {branches.map((branch, bi) => {
              const branchStart = shellStart + 0.9 + bi * 0.7;
              const branchIn = easeOut(segment(time, branchStart, branchStart + 0.6));
              const lY = yOfRow(leafCursor + (branch.mValues.length - 1) / 2);
              leafCursor += branch.mValues.length;
              return (
                <SceneLabel
                  key={`${n}-${branch.l}`}
                  x={geo.lX}
                  y={lY - 6}
                  text={`${branch.l}`}
                  color="#FFFFFF"
                  opacity={branchIn}
                  size={10}
                  bold
                  maxWidth={24}
                />
              );
            })}

            {branches.map((branch, bi) => {
              const branchStart = shellStart + 0.9 + bi * 0.7;
              const branchIn = easeOut(segment(time, branchStart, branchStart + 0.6));
              const lY = yOfRow(
                shellOffsets[shellIndex] +
                  branches.slice(0, bi).reduce((s, b) => s + b.mValues.length, 0) +
                  (branch.mValues.length - 1) / 2,
              );
              return (
                <SceneLabel
                  key={`sub-${n}-${branch.l}`}
                  x={geo.lX + 14}
                  y={lY - 6}
                  text={`${n}${SUBSHELL_LETTER[branch.l]}`}
                  color={c.label}
                  opacity={branchIn}
                  size={9}
                  anchor="start"
                  maxWidth={40}
                />
              );
            })}
          </View>
        );
      })}

      <SceneLabel
        x={width * 0.5}
        y={height * 0.89}
        text="1, 4, 9 → කාක්ෂික ගණන = n²  ·  ඉලෙක්ට්‍රෝන ගණන = 2n²"
        color={c.labelStrong}
        opacity={summaryIn}
        size={11}
        bold
        maxWidth={width * 0.94}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.95}
        text="කටපාඩම් කිරීම අවශ්‍ය නැත — ශාඛා ගණන් කළ හැක"
        color={c.success}
        opacity={summaryIn}
        size={10}
        maxWidth={width * 0.94}
      />
    </View>
  );
}
