import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { easeOut, lerp, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * මිලිකන්ගේ තෙල් බිංදු පරීක්ෂාව (Millikan's oil drop experiment).
 *
 * Thomson's tube gives e/m — a *ratio*. Neither e nor m is known until this
 * experiment pins down e, and only then does the electron's mass fall out. That
 * dependency is the part students miss, so the closing frame states it as an
 * equation rather than leaving it implied.
 *
 * The teaching moment is the bar chart at the end. Every drop carries a
 * different charge, yet every measured value is a whole-number multiple of one
 * small quantity. "Quantised" stops being vocabulary the moment you can see that
 * no bar ever lands between the gridlines.
 *
 * Balance condition shown on screen:   q E = m g   →   q = m g / E
 */

/** Measured charges, as multiples of e — the shape of Millikan's real data. */
const MEASURED = [2, 5, 3, 8, 4, 6, 3, 7];

export function MillikanOilDrop({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const cx = width * 0.3;
    const plateTop = height * 0.24;
    const plateBottom = height * 0.72;
    return {
      cx,
      plateTop,
      plateBottom,
      plateW: width * 0.4,
      plateX: width * 0.1,
      chartX: width * 0.58,
      chartW: width * 0.36,
      chartTop: height * 0.2,
      chartBottom: height * 0.74,
    };
  }, [width, height]);

  const time = reduceMotion ? 21 : t;

  const appear = easeOut(segment(time, 0, 1.4));
  const dropIn = easeOut(segment(time, 2.0, 2.8));
  const fieldOn = easeOut(segment(time, 7.4, 8.6));
  const chartIn = easeOut(segment(time, 12.0, 13.0));
  const conclusionIn = easeOut(segment(time, 19.0, 20.2));

  /**
   * The drop's height.
   *
   * Falls at constant (terminal) velocity while the field is off, then holds
   * still once the field balances gravity. Constant velocity rather than
   * acceleration is the physically correct depiction — viscous drag balances
   * weight almost immediately — and it is a detail examiners reward.
   */
  const dropY = ((): number => {
    const fallStart = geo.plateTop + 20;
    const fallEnd = geo.plateBottom - 26;
    if (time < 2.8) return fallStart;
    if (time < 7.4) return lerp(fallStart, fallEnd, segment(time, 2.8, 7.4));
    // Suspended: it stops where it happened to be when the field came on.
    return lerp(fallStart, fallEnd, segment(7.4, 2.8, 7.4));
  })();

  /** Chart scale: tallest bar fits the plotting area. */
  const maxMultiple = Math.max(...MEASURED);
  const barH = (m: number) =>
    ((geo.chartBottom - geo.chartTop) * m) / (maxMultiple + 1);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── Atomiser ─────────────────────────────────────────────────────── */}
        <G opacity={appear}>
          <Path
            d={`M ${geo.cx - 14} ${geo.plateTop - 34}
                L ${geo.cx + 14} ${geo.plateTop - 34}
                L ${geo.cx + 5} ${geo.plateTop - 14}
                L ${geo.cx - 5} ${geo.plateTop - 14} Z`}
            fill={c.muted}
          />
        </G>

        {/* ── Plates ───────────────────────────────────────────────────────── */}
        <G opacity={appear}>
          <Rect
            x={geo.plateX}
            y={geo.plateTop}
            width={geo.plateW}
            height={7}
            rx={2}
            fill={fieldOn > 0.3 ? c.proton : c.muted}
          />
          <Rect
            x={geo.plateX}
            y={geo.plateBottom}
            width={geo.plateW}
            height={7}
            rx={2}
            fill={fieldOn > 0.3 ? c.electron : c.muted}
          />
        </G>

        {/* Field lines appear only once the voltage is applied. */}
        {fieldOn > 0
          ? [0.2, 0.4, 0.6, 0.8].map((f) => (
              <G key={f} opacity={fieldOn * 0.5}>
                <Line
                  x1={geo.plateX + geo.plateW * f}
                  y1={geo.plateTop + 9}
                  x2={geo.plateX + geo.plateW * f}
                  y2={geo.plateBottom - 2}
                  stroke={c.highlight}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                />
              </G>
            ))
          : null}

        {/* ── The drop, with its force arrows ──────────────────────────────── */}
        {dropIn > 0 ? (
          <G opacity={dropIn}>
            <Circle cx={geo.cx} cy={dropY} r={7} fill={c.beam} />
            <Circle cx={geo.cx} cy={dropY} r={7} stroke={c.labelStrong} strokeWidth={0.8} fill="none" />

            {/* Weight, always present. */}
            <Line
              x1={geo.cx}
              y1={dropY + 10}
              x2={geo.cx}
              y2={dropY + 30}
              stroke={c.danger}
              strokeWidth={2}
            />
            <Path
              d={`M ${geo.cx - 4} ${dropY + 23} L ${geo.cx} ${dropY + 30} L ${geo.cx + 4} ${dropY + 23}`}
              stroke={c.danger}
              strokeWidth={2}
              fill="none"
            />

            {/* Electric force, only once the field exists. */}
            {fieldOn > 0 ? (
              <G opacity={fieldOn}>
                <Line
                  x1={geo.cx}
                  y1={dropY - 10}
                  x2={geo.cx}
                  y2={dropY - 30}
                  stroke={c.success}
                  strokeWidth={2}
                />
                <Path
                  d={`M ${geo.cx - 4} ${dropY - 23} L ${geo.cx} ${dropY - 30} L ${geo.cx + 4} ${dropY - 23}`}
                  stroke={c.success}
                  strokeWidth={2}
                  fill="none"
                />
              </G>
            ) : null}
          </G>
        ) : null}

        {/* ── Bar chart of measured charges ────────────────────────────────── */}
        {chartIn > 0 ? (
          <G opacity={chartIn}>
            {/* Gridlines at every whole multiple of e — the point of the chart. */}
            {Array.from({ length: maxMultiple + 1 }, (_, i) => i + 1).map((m) => (
              <Line
                key={`g${m}`}
                x1={geo.chartX}
                y1={geo.chartBottom - barH(m)}
                x2={geo.chartX + geo.chartW}
                y2={geo.chartBottom - barH(m)}
                stroke={c.grid}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            ))}

            <Line
              x1={geo.chartX}
              y1={geo.chartBottom}
              x2={geo.chartX + geo.chartW}
              y2={geo.chartBottom}
              stroke={c.axis}
              strokeWidth={1.5}
            />

            {MEASURED.map((m, i) => {
              // Bars land one at a time, as if each drop were measured in turn.
              const grow = easeOut(segment(time, 13.2 + i * 0.55, 13.9 + i * 0.55));
              const w = geo.chartW / (MEASURED.length * 1.5);
              const x = geo.chartX + (i + 0.4) * (geo.chartW / MEASURED.length);
              return (
                <Rect
                  key={`bar${i}`}
                  x={x}
                  y={geo.chartBottom - barH(m) * grow}
                  width={w}
                  height={barH(m) * grow}
                  rx={2}
                  fill={c.beam}
                  opacity={0.9}
                />
              );
            })}
          </G>
        ) : null}
      </Svg>

      {/* ── Labels ───────────────────────────────────────────────────────── */}
      <SceneLabel
        x={geo.cx}
        y={geo.plateTop - 52}
        text="තෙල් ඉසින උපකරණය"
        color={c.label}
        opacity={appear}
        size={10}
        maxWidth={130}
      />
      <SceneLabel
        x={geo.plateX + geo.plateW + 6}
        y={geo.plateTop - 4}
        text={fieldOn > 0.3 ? '(+)' : ''}
        color={c.proton}
        opacity={fieldOn}
        size={11}
        bold
        anchor="start"
        maxWidth={40}
      />
      <SceneLabel
        x={geo.plateX + geo.plateW + 6}
        y={geo.plateBottom - 4}
        text={fieldOn > 0.3 ? '(−)' : ''}
        color={c.electron}
        opacity={fieldOn}
        size={11}
        bold
        anchor="start"
        maxWidth={40}
      />

      <SceneLabel
        x={geo.cx + 16}
        y={geo.plateBottom + 16}
        text="ක්ෂේත්‍රය නැත → බිංදුව ඒකාකාර වේගයෙන් වැටේ (mg)"
        color={c.danger}
        opacity={segment(time, 3.2, 4.0) * (1 - fieldOn)}
        size={10}
        bold
        anchor="start"
        maxWidth={width * 0.55}
      />
      <SceneLabel
        x={geo.plateX}
        y={geo.plateBottom + 16}
        text="qE = mg  →  බිංදුව නතර වේ  →  q = mg/E"
        color={c.success}
        opacity={fieldOn * (1 - conclusionIn)}
        size={11}
        bold
        anchor="start"
        maxWidth={width * 0.5}
      />

      <SceneLabel
        x={geo.chartX + geo.chartW / 2}
        y={geo.chartTop - 22}
        text="මනින ලද ආරෝපණ"
        color={c.labelStrong}
        opacity={chartIn}
        size={10}
        bold
        maxWidth={width * 0.36}
      />
      {Array.from({ length: maxMultiple }, (_, i) => i + 1).map((m) => (
        <SceneLabel
          key={`gl${m}`}
          x={geo.chartX - 26}
          y={geo.chartBottom - barH(m) - 7}
          text={`${m}e`}
          color={c.label}
          opacity={chartIn * 0.9}
          size={9}
          anchor="start"
          maxWidth={26}
        />
      ))}

      <SceneLabel
        x={width * 0.5}
        y={height * 0.88}
        text="සෑම අගයක් ම e හි පූර්ණ සංඛ්‍යා ගුණාකාරයකි → ආරෝපණය ක්වොන්ටීකෘතයි"
        color={c.labelStrong}
        opacity={segment(time, 17.4, 18.4) * (1 - conclusionIn)}
        size={11}
        bold
        maxWidth={width * 0.92}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.86}
        text={
          'e = 1.602 × 10⁻¹⁹ C\n' +
          'තොම්සන්ගෙන් e/m = 1.76 × 10⁸ C g⁻¹\n' +
          '∴ m = e ÷ (e/m) = 9.10 × 10⁻²⁸ g'
        }
        color={c.success}
        opacity={conclusionIn}
        size={11}
        bold
        maxWidth={width * 0.92}
      />
    </View>
  );
}
