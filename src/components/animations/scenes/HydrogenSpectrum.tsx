import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { clamp, easeInOut, easeOut, lerp, pulse, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * 1.3.1 — හයිඩ්‍රජන් වර්ණාවලිය (The hydrogen spectrum).
 *
 * This is the argument the whole unit turns on: *the spectrum is a set of lines,
 * not a rainbow, therefore energy is quantised.* Two static figures — a ladder
 * and a spectrum — force the student to believe that connection on authority.
 * Here the connection is shown: the electron falls a specific gap, a photon of
 * exactly that energy leaves, and a line appears at exactly that wavelength.
 *
 * ## Everything on screen is computed, not drawn by hand
 *
 *   Eₙ = −1312 / n²  kJ mol⁻¹        (the real hydrogen energy levels)
 *   ΔE = E_high − E_low               (the gap the electron falls)
 *   λ  ∝ 1 / ΔE                       (larger drop → shorter wavelength)
 *
 * So the level spacing converging as n grows, and the Balmer lines crowding
 * together toward the violet end, are the *same fact* appearing twice — which is
 * exactly what the lesson's image note says students fail to connect. Because
 * the positions come from the formula, a student can check them against the
 * 656 / 486 / 434 / 410 nm values in their book.
 */

/** Rydberg-style level energy in kJ mol⁻¹. */
function energyOf(n: number): number {
  return -1312 / (n * n);
}

const LEVELS = [1, 2, 3, 4, 5, 6];
const GROUND = energyOf(1);

/** The four visible Balmer lines, as n → 2 transitions. */
const BALMER: Array<{ from: number; nm: number; colour: string }> = [
  { from: 3, nm: 656, colour: '#EF4444' },
  { from: 4, nm: 486, colour: '#22D3EE' },
  { from: 5, nm: 434, colour: '#3B82F6' },
  { from: 6, nm: 410, colour: '#8B5CF6' },
];

/** Each Balmer line gets its own window, so they appear one at a time. */
const LINE_WINDOWS: Array<[start: number, end: number]> = [
  [13.0, 15.4],
  [15.6, 17.4],
  [17.6, 19.4],
  [19.6, 21.4],
];

export function HydrogenSpectrum({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const ladderX = width * 0.16;
    const ladderW = width * 0.36;
    const top = height * 0.13;
    const bottom = height * 0.60;
    const specY = height * 0.78;
    return {
      ladderX,
      ladderW,
      top,
      bottom,
      specY,
      specX: width * 0.08,
      specW: width * 0.84,
      specH: height * 0.09,
    };
  }, [width, height]);

  /** Energy → y. E = 0 sits at the top, the ground state at the bottom. */
  const yOf = (e: number): number =>
    geo.top + (e / GROUND) * (geo.bottom - geo.top);

  /** Visible wavelength → x on the spectrum strip. */
  const xOfNm = (nm: number): number =>
    geo.specX + ((nm - 395) / (760 - 395)) * geo.specW;

  const time = reduceMotion ? 23 : t;

  const ladderIn = easeOut(segment(time, 0, 1.6));
  const absorbIn = segment(time, 4.0, 6.4);
  const emitBalmer = segment(time, 8.4, 10.6);
  const lymanIn = segment(time, 22.0, 24.0);
  const specIn = easeOut(segment(time, 7.6, 8.8));
  const convergeIn = easeOut(segment(time, 24.4, 25.6));

  /**
   * Electron position, expressed as a level number that can be fractional while
   * a transition is in flight. One expression covers the whole timeline, which
   * is what keeps the drawing a pure function of `t`.
   */
  const electronLevel = ((): number => {
    if (time < 4.0) return 1;
    if (time < 6.4) return lerp(1, 3, easeInOut(absorbIn)); // absorption 1 → 3
    if (time < 8.4) return 3;
    if (time < 10.6) return lerp(3, 2, easeInOut(emitBalmer)); // emission 3 → 2
    if (time < 22.0) return 2;
    if (time < 24.0) return lerp(2, 1, easeInOut(lymanIn)); // emission 2 → 1
    return 1;
  })();

  const electronY = yOf(energyOf(Math.max(1, electronLevel)));

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── Energy level ladder ──────────────────────────────────────────── */}
        {LEVELS.map((n, i) => {
          const y = yOf(energyOf(n));
          const reveal = easeOut(segment(time, 0.2 + i * 0.16, 1.0 + i * 0.16));
          return (
            <G key={`lvl${n}`} opacity={reveal * ladderIn}>
              <Line
                x1={geo.ladderX}
                y1={y}
                x2={geo.ladderX + geo.ladderW}
                y2={y}
                stroke={c.axis}
                strokeWidth={n === 1 ? 2.5 : 1.6}
              />
            </G>
          );
        })}

        {/* n = ∞ (E = 0), the convergence limit. */}
        <Line
          x1={geo.ladderX}
          y1={geo.top}
          x2={geo.ladderX + geo.ladderW}
          y2={geo.top}
          stroke={c.highlight}
          strokeWidth={1.4}
          strokeDasharray="5 4"
          opacity={ladderIn * 0.85}
        />

        {/* ── Absorption arrow: energy in, electron climbs ─────────────────── */}
        {absorbIn > 0 && time < 8.4 ? (
          <G opacity={clamp(absorbIn * (1 - segment(time, 7.4, 8.4)))}>
            <Line
              x1={geo.ladderX + geo.ladderW * 0.28}
              y1={yOf(energyOf(1))}
              x2={geo.ladderX + geo.ladderW * 0.28}
              y2={yOf(energyOf(3))}
              stroke={c.success}
              strokeWidth={2}
            />
            <Path
              d={`M ${geo.ladderX + geo.ladderW * 0.28 - 4} ${yOf(energyOf(3)) + 7}
                  L ${geo.ladderX + geo.ladderW * 0.28} ${yOf(energyOf(3))}
                  L ${geo.ladderX + geo.ladderW * 0.28 + 4} ${yOf(energyOf(3)) + 7}`}
              stroke={c.success}
              strokeWidth={2}
              fill="none"
            />
          </G>
        ) : null}

        {/* ── Emission arrows, one per Balmer transition ───────────────────── */}
        {BALMER.map((line, i) => {
          const [start, end] = LINE_WINDOWS[i];
          const active = segment(time, start, start + 1.2);
          const stays = segment(time, start, end);
          if (stays <= 0) return null;
          const x = geo.ladderX + geo.ladderW * (0.42 + i * 0.14);
          const yFrom = yOf(energyOf(line.from));
          const yTo = yOf(energyOf(2));
          return (
            <G key={`em${line.nm}`} opacity={active}>
              <Line x1={x} y1={yFrom} x2={x} y2={yTo} stroke={line.colour} strokeWidth={2} />
              <Path
                d={`M ${x - 4} ${yTo - 7} L ${x} ${yTo} L ${x + 4} ${yTo - 7}`}
                stroke={line.colour}
                strokeWidth={2}
                fill="none"
              />
            </G>
          );
        })}

        {/* ── The photon travelling from the transition to its spectral line ─ */}
        {BALMER.map((line, i) => {
          const [start] = LINE_WINDOWS[i];
          const flight = segment(time, start + 0.5, start + 1.8);
          if (flight <= 0 || flight >= 1) return null;
          const x0 = geo.ladderX + geo.ladderW * (0.42 + i * 0.14);
          const y0 = yOf(energyOf(2));
          const x1 = xOfNm(line.nm);
          const y1 = geo.specY;
          const e = easeInOut(flight);
          return (
            <Circle
              key={`ph${line.nm}`}
              cx={lerp(x0, x1, e)}
              cy={lerp(y0, y1, e)}
              r={4.5}
              fill={line.colour}
              opacity={1 - flight * 0.3}
            />
          );
        })}

        {/* ── The electron ─────────────────────────────────────────────────── */}
        <G opacity={ladderIn}>
          <Circle
            cx={geo.ladderX + geo.ladderW * 0.12}
            cy={electronY}
            r={6}
            fill={c.electron}
          />
          <Circle
            cx={geo.ladderX + geo.ladderW * 0.12}
            cy={electronY}
            r={6 + pulse(time, 4, 6.4) * 5}
            stroke={c.electron}
            strokeWidth={1.4}
            fill="none"
            opacity={0.6}
          />
        </G>

        {/* ── Spectrum strip ───────────────────────────────────────────────── */}
        <G opacity={specIn}>
          <Rect
            x={geo.specX}
            y={geo.specY}
            width={geo.specW}
            height={geo.specH}
            rx={4}
            fill={isDark ? '#07070F' : '#111827'}
            stroke={c.grid}
            strokeWidth={1}
          />
          {BALMER.map((line, i) => {
            const [start, end] = LINE_WINDOWS[i];
            const shown = segment(time, start + 1.6, start + 2.1) * (time < end + 40 ? 1 : 1);
            if (shown <= 0) return null;
            return (
              <Rect
                key={`ln${line.nm}`}
                x={xOfNm(line.nm) - 2}
                y={geo.specY + 3}
                width={4}
                height={geo.specH - 6}
                rx={1.5}
                fill={line.colour}
                opacity={shown}
              />
            );
          })}
        </G>

        {/* ── Lyman: the same rule, but the photon lands outside the visible ─ */}
        {lymanIn > 0 ? (
          <G opacity={lymanIn}>
            <Line
              x1={geo.ladderX + geo.ladderW * 0.9}
              y1={yOf(energyOf(2))}
              x2={geo.ladderX + geo.ladderW * 0.9}
              y2={yOf(energyOf(1))}
              stroke={c.highlight}
              strokeWidth={2}
            />
            <Path
              d={`M ${geo.ladderX + geo.ladderW * 0.9 - 4} ${yOf(GROUND) - 7}
                  L ${geo.ladderX + geo.ladderW * 0.9} ${yOf(GROUND)}
                  L ${geo.ladderX + geo.ladderW * 0.9 + 4} ${yOf(GROUND) - 7}`}
              stroke={c.highlight}
              strokeWidth={2}
              fill="none"
            />
            {/* Marker just off the violet end of the strip. */}
            <Rect
              x={geo.specX - 7}
              y={geo.specY + 3}
              width={4}
              height={geo.specH - 6}
              rx={1.5}
              fill={c.highlight}
              opacity={0.75}
            />
          </G>
        ) : null}

        {/* ── Convergence bracket at the top of the ladder ─────────────────── */}
        {convergeIn > 0 ? (
          <G opacity={convergeIn}>
            <Path
              d={`M ${geo.ladderX + geo.ladderW + 10} ${yOf(energyOf(6))}
                  L ${geo.ladderX + geo.ladderW + 16} ${yOf(energyOf(6))}
                  L ${geo.ladderX + geo.ladderW + 16} ${geo.top}
                  L ${geo.ladderX + geo.ladderW + 10} ${geo.top}`}
              stroke={c.highlight}
              strokeWidth={1.6}
              fill="none"
            />
          </G>
        ) : null}
      </Svg>

      {/* ── Labels ───────────────────────────────────────────────────────── */}
      {LEVELS.map((n, i) => {
        const reveal = easeOut(segment(time, 0.2 + i * 0.16, 1.0 + i * 0.16));
        return (
          <SceneLabel
            key={`lbl${n}`}
            x={geo.ladderX - 54}
            y={yOf(energyOf(n)) - 8}
            text={`n=${n}   ${Math.round(energyOf(n))}`}
            color={c.label}
            opacity={reveal * ladderIn}
            size={9}
            anchor="start"
            maxWidth={62}
          />
        );
      })}
      <SceneLabel
        x={geo.ladderX - 54}
        y={geo.top - 16}
        text="n=∞    0"
        color={c.highlight}
        opacity={ladderIn}
        size={9}
        anchor="start"
        maxWidth={62}
      />
      <SceneLabel
        x={width * 0.5}
        y={2}
        text="ශක්ති මට්ටම් (kJ mol⁻¹)"
        color={c.labelStrong}
        opacity={ladderIn}
        size={11}
        bold
        maxWidth={width * 0.7}
      />

      <SceneLabel
        x={width * 0.74}
        y={geo.top + 10}
        text="ශක්තිය අවශෝෂණය → ඉලෙක්ට්‍රෝනය ඉහළට (n=1→3)"
        color={c.success}
        opacity={clamp(absorbIn * (1 - segment(time, 7.4, 8.4)))}
        size={10}
        bold
        maxWidth={width * 0.28}
      />
      <SceneLabel
        x={width * 0.74}
        y={geo.top + 10}
        text="පහළට වැටෙද්දී ෆෝටෝනයක් පිටවේ — ΔE විශාල නම් λ කුඩායි"
        color={c.labelStrong}
        opacity={segment(time, 9.0, 10.0) * (1 - segment(time, 21.4, 22.2))}
        size={10}
        bold
        maxWidth={width * 0.28}
      />

      <SceneLabel
        x={geo.specX}
        y={geo.specY + geo.specH + 4}
        text="400 nm"
        color={c.label}
        opacity={specIn}
        size={9}
        anchor="start"
        maxWidth={50}
      />
      <SceneLabel
        x={geo.specX + geo.specW - 46}
        y={geo.specY + geo.specH + 4}
        text="750 nm"
        color={c.label}
        opacity={specIn}
        size={9}
        anchor="start"
        maxWidth={50}
      />
      {BALMER.map((line, i) => {
        const [start] = LINE_WINDOWS[i];
        const shown = segment(time, start + 1.6, start + 2.1);
        return (
          <SceneLabel
            key={`nm${line.nm}`}
            x={xOfNm(line.nm)}
            y={geo.specY - 16}
            text={`${line.nm}`}
            color={line.colour}
            opacity={shown}
            size={9}
            bold
            maxWidth={40}
          />
        );
      })}

      <SceneLabel
        x={width * 0.5}
        y={geo.specY - 34}
        text="බාමර් ශ්‍රේණිය (n → 2) — දෘශ්‍ය කලාපයේ"
        color={c.labelStrong}
        opacity={segment(time, 13.4, 14.2) * (1 - segment(time, 21.6, 22.2))}
        size={10}
        bold
        maxWidth={width * 0.8}
      />
      <SceneLabel
        x={width * 0.5}
        y={geo.specY - 34}
        text="ලයිමන් ශ්‍රේණිය (n → 1) — UV, ඇසට නොපෙනේ"
        color={c.highlight}
        opacity={lymanIn}
        size={10}
        bold
        maxWidth={width * 0.8}
      />
      <SceneLabel
        x={geo.ladderX + geo.ladderW + 22}
        y={geo.top + (yOf(energyOf(6)) - geo.top) / 2 - 14}
        text="මට්ටම් එකට තදවේ → රේඛාද එකට තදවේ"
        color={c.highlight}
        opacity={convergeIn}
        size={9}
        anchor="start"
        maxWidth={width * 0.24}
      />
    </View>
  );
}
