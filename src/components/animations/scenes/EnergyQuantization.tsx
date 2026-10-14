import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { easeInOut, easeOut, lerp, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * 1.2.1 — ශක්ති ක්වොන්ටම්කරණය (Energy quantisation).
 *
 * Straight from the lesson's own image note: "ක්වොන්ටීකෘත" is abstract until the
 * opposite is standing next to it. A ball rolling up a ramp can stop anywhere; a
 * ball climbing stairs can only ever rest on a step. Same ball, same height —
 * the difference is entirely in which positions are *allowed*.
 *
 * The animation adds what the still image cannot: a failed attempt. The ball
 * tries to settle between two steps, cannot, and falls back. "Not enough energy
 * to reach the next level means no transition at all" is the idea students need
 * for the photoelectric effect and for line spectra, and it is much easier to
 * believe having watched the ball refuse to stay.
 */

const STEPS = 5;

export function EnergyQuantization({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const baseY = height * 0.78;
    const topY = height * 0.2;
    return {
      baseY,
      topY,
      rampX0: width * 0.08,
      rampX1: width * 0.44,
      stairX0: width * 0.56,
      stairX1: width * 0.94,
      stepW: (width * 0.38) / STEPS,
      stepH: (height * 0.58) / STEPS,
    };
  }, [width, height]);

  const time = reduceMotion ? 17 : t;

  const rampIn = easeOut(segment(time, 0, 1.4));
  const stairIn = easeOut(segment(time, 1.6, 3.0));
  const conclusionIn = easeOut(segment(time, 16.0, 17.2));

  /** Ramp ball: climbs smoothly and can rest at any height. */
  const rampU = ((): number => {
    if (time < 3.6) return 0;
    if (time < 6.6) return easeInOut(segment(time, 3.6, 6.6)) * 0.62;
    if (time < 8.0) return 0.62;
    return lerp(0.62, 0.87, easeInOut(segment(time, 8.0, 9.6)));
  })();

  const rampX = lerp(geo.rampX0, geo.rampX1, rampU);
  const rampY = lerp(geo.baseY, geo.topY, rampU);

  /**
   * Stair ball: quantised. The failed attempt between 11.4 s and 13.2 s rises
   * partway to step 3, stalls, and drops back to step 2.
   */
  const stairLevel = ((): number => {
    if (time < 4.4) return 0;
    if (time < 6.0) return lerp(0, 1, easeInOut(segment(time, 4.4, 6.0)));
    if (time < 7.6) return 1;
    if (time < 9.2) return lerp(1, 2, easeInOut(segment(time, 7.6, 9.2)));
    if (time < 11.4) return 2;
    // Failed attempt — not enough energy for step 3.
    if (time < 12.4) return lerp(2, 2.55, easeInOut(segment(time, 11.4, 12.4)));
    if (time < 13.4) return lerp(2.55, 2, easeInOut(segment(time, 12.4, 13.4)));
    if (time < 14.6) return 2;
    return lerp(2, 3, easeInOut(segment(time, 14.6, 15.8)));
  })();

  const stairX = geo.stairX0 + (stairLevel + 0.5) * geo.stepW;
  const stairY = geo.baseY - stairLevel * geo.stepH;
  const isStranded = time >= 11.9 && time < 12.9;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── Left: the continuous ramp ────────────────────────────────────── */}
        <G opacity={rampIn}>
          <Line
            x1={geo.rampX0}
            y1={geo.baseY}
            x2={geo.rampX1}
            y2={geo.topY}
            stroke={c.axis}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <Line
            x1={geo.rampX0}
            y1={geo.baseY}
            x2={geo.rampX1}
            y2={geo.baseY}
            stroke={c.grid}
            strokeWidth={1.5}
          />
          {/* Every height is reachable — shown as a dense set of tick marks. */}
          {Array.from({ length: 14 }, (_, i) => (i + 1) / 15).map((f) => (
            <Circle
              key={f}
              cx={lerp(geo.rampX0, geo.rampX1, f)}
              cy={lerp(geo.baseY, geo.topY, f)}
              r={1.2}
              fill={c.success}
              opacity={0.55}
            />
          ))}
          <Circle cx={rampX} cy={rampY - 8} r={8} fill={c.success} />
        </G>

        {/* ── Right: the quantised staircase ───────────────────────────────── */}
        <G opacity={stairIn}>
          {Array.from({ length: STEPS }, (_, i) => (
            <G key={`s${i}`}>
              <Rect
                x={geo.stairX0 + i * geo.stepW}
                y={geo.baseY - i * geo.stepH}
                width={geo.stepW}
                height={4}
                rx={2}
                fill={c.axis}
              />
              <Line
                x1={geo.stairX0 + (i + 1) * geo.stepW}
                y1={geo.baseY - i * geo.stepH}
                x2={geo.stairX0 + (i + 1) * geo.stepW}
                y2={geo.baseY - (i + 1) * geo.stepH}
                stroke={c.grid}
                strokeWidth={1.5}
              />
            </G>
          ))}

          {/* The forbidden zone the ball cannot occupy. */}
          {isStranded ? (
            <Rect
              x={geo.stairX0 + 2 * geo.stepW}
              y={geo.baseY - 3 * geo.stepH}
              width={geo.stepW * 2}
              height={geo.stepH}
              fill={c.danger}
              opacity={0.14}
            />
          ) : null}

          <Circle
            cx={stairX}
            cy={stairY - 10}
            r={8}
            fill={isStranded ? c.danger : c.highlight}
          />

          {/* A cross over the ball at the moment it fails to hold position. */}
          {isStranded ? (
            <G opacity={0.9}>
              <Path
                d={`M ${stairX - 16} ${stairY - 26} L ${stairX - 6} ${stairY - 16}
                    M ${stairX - 6} ${stairY - 26} L ${stairX - 16} ${stairY - 16}`}
                stroke={c.danger}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </G>
          ) : null}
        </G>
      </Svg>

      <SceneLabel
        x={(geo.rampX0 + geo.rampX1) / 2}
        y={height * 0.06}
        text="බෑවුම — අඛණ්ඩ"
        color={c.success}
        opacity={rampIn}
        size={12}
        bold
        maxWidth={width * 0.4}
      />
      <SceneLabel
        x={(geo.rampX0 + geo.rampX1) / 2}
        y={height * 0.86}
        text="ඕනෑම උසකින් නැවතිය හැක"
        color={c.label}
        opacity={rampIn}
        size={10}
        maxWidth={width * 0.4}
      />

      <SceneLabel
        x={(geo.stairX0 + geo.stairX1) / 2}
        y={height * 0.06}
        text="තරප්පු — ක්වොන්ටීකෘත"
        color={c.highlight}
        opacity={stairIn}
        size={12}
        bold
        maxWidth={width * 0.4}
      />
      <SceneLabel
        x={(geo.stairX0 + geo.stairX1) / 2}
        y={height * 0.86}
        text="නිශ්චිත මට්ටම්වල පමණක් නැවතිය හැක"
        color={c.label}
        opacity={stairIn * (1 - conclusionIn)}
        size={10}
        maxWidth={width * 0.42}
      />
      <SceneLabel
        x={(geo.stairX0 + geo.stairX1) / 2}
        y={height * 0.12}
        text="ප්‍රමාණවත් ශක්තියක් නැත → සංක්‍රමණයක් සිදු නොවේ"
        color={c.danger}
        opacity={isStranded ? 1 : 0}
        size={10}
        bold
        maxWidth={width * 0.42}
      />

      <SceneLabel
        x={width * 0.5}
        y={height * 0.92}
        text="පරමාණුවක ඉලෙක්ට්‍රෝන ශක්තිය තරප්පු පෙළක් වැනියි — E = hν පැකට්ටුවලින් පමණක් හුවමාරු වේ"
        color={c.labelStrong}
        opacity={conclusionIn}
        size={11}
        bold
        maxWidth={width * 0.94}
      />
    </View>
  );
}
