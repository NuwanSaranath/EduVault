import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import { AUFBAU_ANOMALIES } from '@/features/animation/periodicTable';
import type { SceneProps } from '@/features/animation/types';
import { easeOut, pulse, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.4 — ඉලෙක්ට්‍රෝන විනයාස (Electron configuration).
 *
 * Three rules taught together because they only make sense together:
 *
 *   අවුෆ්බාවු  which subshell fills next   (lowest energy first)
 *   පව්ලි      how many fit in one box     (two, and opposite spins)
 *   හුන්ඩ්     how they spread within it   (singly first, then pair)
 *
 * The subshells are drawn as an **energy ladder**, and 4s sits *below* 3d
 * because that is the actual ordering. Doing it this way means the Cr and Cu
 * anomalies at the end are not a separate fact to memorise — the boxes are
 * already in the order that explains them.
 *
 * Hund's rule is enforced by `occupancyOf` rather than hard-coded per element,
 * so what appears in the boxes is derived the same way a student derives it.
 * Stage 3 then shows the rule being *broken* and rejected, which is the device
 * that makes a rule stick better than a correct example does.
 */

type BoxState = 'empty' | 'up' | 'pair';

interface Subshell {
  id: string;
  label: string;
  /** Number of orbitals (boxes): s=1, p=3, d=5. */
  boxes: number;
  /** Fill order position, 1-based — the Aufbau sequence. */
  order: number;
}

/** Energy order, lowest first. Note 4s before 3d. */
const SUBSHELLS: Subshell[] = [
  { id: '1s', label: '1s', boxes: 1, order: 1 },
  { id: '2s', label: '2s', boxes: 1, order: 2 },
  { id: '2p', label: '2p', boxes: 3, order: 3 },
  { id: '3s', label: '3s', boxes: 1, order: 4 },
  { id: '3p', label: '3p', boxes: 3, order: 5 },
  { id: '4s', label: '4s', boxes: 1, order: 6 },
  { id: '3d', label: '3d', boxes: 5, order: 7 },
  { id: '4p', label: '4p', boxes: 3, order: 8 },
];

/**
 * Hund's rule, implemented rather than tabulated: every box gets one electron
 * before any box gets two.
 */
function occupancyOf(electrons: number, boxes: number): BoxState[] {
  const singles = Math.min(electrons, boxes);
  const pairs = Math.max(0, electrons - boxes);
  return Array.from({ length: boxes }, (_, i) => {
    if (i < pairs) return 'pair';
    if (i < singles) return 'up';
    return 'empty';
  });
}

interface Step {
  at: number;
  symbol: string;
  nameSi: string;
  config: Record<string, number>;
  noteSi?: string;
}

const STEPS: Step[] = [
  { at: 4, symbol: 'H', nameSi: 'හයිඩ්‍රජන්', config: { '1s': 1 } },
  { at: 6, symbol: 'He', nameSi: 'හීලියම්', config: { '1s': 2 }, noteSi: 'පව්ලි: එක කොටුවක උපරිම 2ක්, විරුද්ධ භ්‍රමණ (↑↓)' },
  { at: 8.5, symbol: 'Li', nameSi: 'ලිතියම්', config: { '1s': 2, '2s': 1 } },
  { at: 10.5, symbol: 'B', nameSi: 'බෝරෝන්', config: { '1s': 2, '2s': 2, '2p': 1 } },
  { at: 12.5, symbol: 'C', nameSi: 'කාබන්', config: { '1s': 2, '2s': 2, '2p': 2 }, noteSi: 'හුන්ඩ්: දෙවැනි ඉලෙක්ට්‍රෝනය අලුත් කොටුවකට — ජෝඩු නොවේ' },
  { at: 17.5, symbol: 'N', nameSi: 'නයිට්‍රජන්', config: { '1s': 2, '2s': 2, '2p': 3 }, noteSi: 'තුනම තනි තනිව, එකම දිශාවට' },
  { at: 19.5, symbol: 'O', nameSi: 'ඔක්සිජන්', config: { '1s': 2, '2s': 2, '2p': 4 }, noteSi: 'කොටු ඉවර වූ පසු පමණක් ජෝඩු වීම ඇරඹේ' },
  {
    at: 22,
    symbol: 'Cr',
    nameSi: 'ක්‍රෝමියම්',
    config: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '4s': 1, '3d': 5 },
    noteSi: 'අපේක්ෂිත 4s² 3d⁴ නොවේ — අර්ධ පිරුණු 3d⁵ වඩාත් ස්ථායීයි',
  },
  {
    at: 25,
    symbol: 'Cu',
    nameSi: 'කොපර්',
    config: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '4s': 1, '3d': 10 },
    noteSi: 'අපේක්ෂිත 4s² 3d⁹ නොවේ — සම්පූර්ණ පිරුණු 3d¹⁰ වඩාත් ස්ථායීයි',
  },
];

/** The deliberately wrong placement, shown and rejected. */
const VIOLATION_FROM = 14.4;
const VIOLATION_TO = 17.0;

export function AufbauFilling({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const rows = SUBSHELLS.length;
    const usable = height * 0.7;
    const rowH = usable / rows;
    const box = Math.min(rowH * 0.68, 20);
    return {
      rowH,
      box,
      top: height * 0.13,
      labelX: width * 0.08,
      boxX: width * 0.2,
      gap: box * 0.34,
    };
  }, [width, height]);

  const time = reduceMotion ? 27 : t;

  const laddersIn = easeOut(segment(time, 0, 1.6));
  const conclusionIn = easeOut(segment(time, 27.4, 29));

  /** The most recent step at or before `time`. */
  const step = STEPS.reduce<Step | null>((acc, s) => (time >= s.at ? s : acc), null);

  const violating = time >= VIOLATION_FROM && time < VIOLATION_TO;

  /** Energy increases upward, so the first subshell sits at the bottom. */
  const yOfRow = (index: number) =>
    geo.top + (SUBSHELLS.length - 1 - index) * geo.rowH;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Energy axis */}
        <G opacity={laddersIn}>
          <Line
            x1={width * 0.045}
            y1={geo.top + SUBSHELLS.length * geo.rowH}
            x2={width * 0.045}
            y2={geo.top - 6}
            stroke={c.axis}
            strokeWidth={1.4}
          />
          <Path
            d={`M ${width * 0.045 - 4} ${geo.top} L ${width * 0.045} ${geo.top - 7}
                L ${width * 0.045 + 4} ${geo.top}`}
            stroke={c.axis}
            strokeWidth={1.4}
            fill="none"
          />
        </G>

        {SUBSHELLS.map((subshell, index) => {
          const y = yOfRow(index);
          const rowIn = easeOut(segment(time, 0.2 + index * 0.14, 1.0 + index * 0.14));
          const electrons = step?.config[subshell.id] ?? 0;

          let states = occupancyOf(electrons, subshell.boxes);

          // The rejected placement: carbon's 2p² crammed into one box.
          if (violating && subshell.id === '2p') {
            states = ['pair', 'empty', 'empty'];
          }

          return (
            <G key={subshell.id} opacity={rowIn * laddersIn}>
              {states.map((state, b) => {
                const x = geo.boxX + b * (geo.box + geo.gap);
                const isViolatingBox = violating && subshell.id === '2p' && b === 0;
                return (
                  <G key={b}>
                    <Rect
                      x={x}
                      y={y - geo.box / 2}
                      width={geo.box}
                      height={geo.box}
                      rx={3}
                      stroke={isViolatingBox ? c.danger : c.axis}
                      strokeWidth={isViolatingBox ? 2.2 : 1.2}
                      fill="none"
                    />

                    {/* Spin arrows. A pair is ↑ and ↓, never ↑↑ — Pauli drawn
                        rather than asserted. */}
                    {state !== 'empty' ? (
                      <Path
                        d={`M ${x + geo.box * 0.33} ${y + geo.box * 0.3}
                            L ${x + geo.box * 0.33} ${y - geo.box * 0.3}
                            M ${x + geo.box * 0.2} ${y - geo.box * 0.13}
                            L ${x + geo.box * 0.33} ${y - geo.box * 0.3}
                            L ${x + geo.box * 0.46} ${y - geo.box * 0.13}`}
                        stroke={isViolatingBox ? c.danger : c.electron}
                        strokeWidth={1.6}
                        fill="none"
                      />
                    ) : null}
                    {state === 'pair' ? (
                      <Path
                        d={`M ${x + geo.box * 0.67} ${y - geo.box * 0.3}
                            L ${x + geo.box * 0.67} ${y + geo.box * 0.3}
                            M ${x + geo.box * 0.54} ${y + geo.box * 0.13}
                            L ${x + geo.box * 0.67} ${y + geo.box * 0.3}
                            L ${x + geo.box * 0.8} ${y + geo.box * 0.13}`}
                        stroke={isViolatingBox ? c.danger : c.proton}
                        strokeWidth={1.6}
                        fill="none"
                      />
                    ) : null}
                  </G>
                );
              })}

              {/* The rejection mark. */}
              {violating && subshell.id === '2p' ? (
                <G opacity={0.5 + pulse(time, VIOLATION_FROM, VIOLATION_TO) * 0.5}>
                  <Path
                    d={`M ${geo.boxX - 4} ${y - geo.box * 0.7} L ${geo.boxX + geo.box + 4} ${y + geo.box * 0.7}
                        M ${geo.boxX + geo.box + 4} ${y - geo.box * 0.7} L ${geo.boxX - 4} ${y + geo.box * 0.7}`}
                    stroke={c.danger}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                  />
                </G>
              ) : null}
            </G>
          );
        })}
      </Svg>

      {/* ── Subshell labels and fill order ───────────────────────────────── */}
      {SUBSHELLS.map((subshell, index) => {
        const rowIn = easeOut(segment(time, 0.2 + index * 0.14, 1.0 + index * 0.14));
        const y = yOfRow(index);
        return (
          <View key={subshell.id}>
            <SceneLabel
              x={geo.labelX}
              y={y - 7}
              text={subshell.label}
              color={c.label}
              opacity={rowIn}
              size={11}
              bold
              anchor="start"
              maxWidth={40}
            />
            <SceneLabel
              x={geo.labelX + 26}
              y={y - 5}
              text={`${subshell.order}`}
              color={c.muted}
              opacity={rowIn * 0.9}
              size={8}
              anchor="start"
              maxWidth={20}
            />
          </View>
        );
      })}

      <SceneLabel
        x={width * 0.045}
        y={geo.top - 26}
        text="ශක්තිය"
        color={c.label}
        opacity={laddersIn}
        size={9}
        maxWidth={60}
      />
      <SceneLabel
        x={geo.labelX + 6}
        y={height * 0.055}
        text="පිරවෙන අනුපිළිවෙල →"
        color={c.muted}
        opacity={laddersIn}
        size={8}
        anchor="start"
        maxWidth={120}
      />

      {/* 4s below 3d is the fact the anomalies rest on, so it is called out. */}
      <SceneLabel
        x={width * 0.5}
        y={yOfRow(5) - 8}
        text="4s, 3d ට වඩා පහළින් → කලින් පිරවේ"
        color={c.highlight}
        opacity={easeOut(segment(time, 2, 3.2)) * (1 - segment(time, 9, 10))}
        size={9}
        anchor="start"
        maxWidth={width * 0.42}
      />

      {/* ── Current element ──────────────────────────────────────────────── */}
      {step ? (
        <>
          <SceneLabel
            x={width * 0.78}
            y={height * 0.14}
            text={step.symbol}
            color={c.labelStrong}
            opacity={1}
            size={26}
            bold
            maxWidth={width * 0.3}
          />
          <SceneLabel
            x={width * 0.78}
            y={height * 0.28}
            text={step.nameSi}
            color={c.label}
            opacity={1}
            size={10}
            maxWidth={width * 0.3}
          />
        </>
      ) : null}

      {step?.noteSi && !violating ? (
        <SceneLabel
          x={width * 0.78}
          y={height * 0.38}
          text={step.noteSi}
          color={c.success}
          opacity={1}
          size={9}
          bold
          maxWidth={width * 0.32}
        />
      ) : null}

      {violating ? (
        <SceneLabel
          x={width * 0.78}
          y={height * 0.38}
          text={'මෙසේ නොවේ!\nකොටු තිබියදී ජෝඩු නොවේ —\nහුන්ඩ්ගේ නීතිය'}
          color={c.danger}
          opacity={1}
          size={10}
          bold
          maxWidth={width * 0.32}
        />
      ) : null}

      {/* ── Anomaly callouts ─────────────────────────────────────────────── */}
      {AUFBAU_ANOMALIES.map((anomaly, i) => {
        const shown = easeOut(segment(time, 22.4 + i * 3, 23.4 + i * 3)) *
          (i === 0 ? 1 - segment(time, 24.6, 25.4) : 1);
        if (shown <= 0.01) return null;
        return (
          <SceneLabel
            key={anomaly.symbol}
            x={width * 0.5}
            y={height * 0.88}
            text={`${anomaly.symbol}:  ${anomaly.expected}  ✗    ${anomaly.actual}  ✓`}
            color={c.nucleus}
            opacity={shown}
            size={10}
            bold
            maxWidth={width * 0.94}
          />
        );
      })}

      <SceneLabel
        x={width * 0.5}
        y={height * 0.9}
        text="අවුෆ්බාවු (පිළිවෙල) → පව්ලි (කොටුවකට 2යි, ↑↓) → හුන්ඩ් (තනිව පළමුව)"
        color={c.labelStrong}
        opacity={conclusionIn}
        size={11}
        bold
        maxWidth={width * 0.94}
      />
    </View>
  );
}
