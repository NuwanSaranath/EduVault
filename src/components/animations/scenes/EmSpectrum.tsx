import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { easeInOut, easeOut, lerp, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.2 — විද්‍යුත්-චුම්බක වර්ණාවලිය (The EM spectrum).
 *
 * Two things a printed spectrum chart cannot do, both of which this scene exists
 * for:
 *
 *   1. **Show λ and ν as genuinely inverse.** On paper they are two axis labels
 *      running opposite ways and the student takes it on trust. Here a single
 *      marker sweeps the bar while the wave beneath it visibly stretches and the
 *      two readouts move in opposite directions at the same instant.
 *
 *   2. **Show how little of it we see.** The visible band is ~0.3 of a decade
 *      out of 15 — roughly 2% of the bar, and correctly drawn it is a sliver you
 *      could miss. The zoom at the end expands that sliver to full width, which
 *      is the moment the lesson's image note is aiming at.
 *
 * Band positions come from log₁₀(λ/m), so the visible band's width relative to
 * the whole is real rather than exaggerated for legibility.
 */

interface Band {
  labelSi: string;
  /** log₁₀ of wavelength in metres, [from, to]. */
  logFrom: number;
  logTo: number;
  colour: string;
}

const BANDS: Band[] = [
  { labelSi: 'ගැමා', logFrom: -14, logTo: -11, colour: '#7C3AED' },
  { labelSi: 'X කිරණ', logFrom: -11, logTo: -8, colour: '#6366F1' },
  { labelSi: 'UV', logFrom: -8, logTo: -6.4, colour: '#3B82F6' },
  { labelSi: 'දෘශ්‍ය', logFrom: -6.4, logTo: -6.12, colour: '#22C55E' },
  { labelSi: 'IR', logFrom: -6.12, logTo: -3, colour: '#F59E0B' },
  { labelSi: 'මයික්‍රෝ', logFrom: -3, logTo: -1, colour: '#EF4444' },
  { labelSi: 'රේඩියෝ', logFrom: -1, logTo: 4, colour: '#EC4899' },
];

const LOG_MIN = -14;
const LOG_MAX = 4;

/** The visible band, expanded in the final stage. */
const VISIBLE_COLOURS = [
  { nm: 400, colour: '#8B5CF6' },
  { nm: 450, colour: '#3B82F6' },
  { nm: 500, colour: '#22D3EE' },
  { nm: 550, colour: '#22C55E' },
  { nm: 600, colour: '#EAB308' },
  { nm: 650, colour: '#F97316' },
  { nm: 750, colour: '#EF4444' },
];

export function EmSpectrum({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const barX = width * 0.06;
    const barW = width * 0.88;
    return {
      barX,
      barW,
      barY: height * 0.2,
      barH: Math.min(height * 0.13, 40),
      waveY: height * 0.56,
      zoomY: height * 0.72,
      zoomH: Math.min(height * 0.12, 38),
    };
  }, [width, height]);

  const time = reduceMotion ? 18 : t;

  /** log₁₀λ → x on the bar. */
  const xOfLog = (log: number): number =>
    geo.barX + ((log - LOG_MIN) / (LOG_MAX - LOG_MIN)) * geo.barW;

  const barIn = easeOut(segment(time, 0, 1.6));
  const sweep = easeInOut(segment(time, 5, 11.5));
  const zoomIn = easeOut(segment(time, 12, 13.6));
  const conclusionIn = easeOut(segment(time, 17, 18.4));

  /** Marker position as a log value, swept left (gamma) to right (radio). */
  const markerLog = lerp(LOG_MIN + 0.5, LOG_MAX - 0.5, sweep);
  const markerX = xOfLog(markerLog);

  /** Drawn wavelength in px. Grows with the marker so λ visibly stretches. */
  const drawnWavelength = lerp(7, 96, sweep);

  /** A sine wave of the current drawn wavelength. */
  const wavePath = ((): string => {
    const x0 = geo.barX;
    const x1 = geo.barX + geo.barW;
    const amp = 15;
    let d = `M ${x0} ${geo.waveY}`;
    for (let x = x0; x <= x1; x += 3) {
      const y = geo.waveY - Math.sin(((x - x0) / drawnWavelength) * Math.PI * 2) * amp;
      d += ` L ${x} ${y}`;
    }
    return d;
  })();

  const visibleX0 = xOfLog(-6.4);
  const visibleX1 = xOfLog(-6.12);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── The spectrum bar ─────────────────────────────────────────────── */}
        <G opacity={barIn}>
          {BANDS.map((band) => {
            const x0 = xOfLog(band.logFrom);
            const x1 = xOfLog(band.logTo);
            return (
              <Rect
                key={band.labelSi}
                x={x0}
                y={geo.barY}
                width={Math.max(1.5, x1 - x0)}
                height={geo.barH}
                fill={band.colour}
                opacity={0.85}
              />
            );
          })}

          {/* The visible band, outlined so the sliver is findable at all. */}
          <Rect
            x={visibleX0 - 1}
            y={geo.barY - 5}
            width={Math.max(3, visibleX1 - visibleX0 + 2)}
            height={geo.barH + 10}
            stroke={c.labelStrong}
            strokeWidth={1.6}
            fill="none"
          />
        </G>

        {/* ── Opposed axes: λ grows right, ν grows left ────────────────────── */}
        <G opacity={barIn}>
          <Line
            x1={geo.barX}
            y1={geo.barY + geo.barH + 16}
            x2={geo.barX + geo.barW}
            y2={geo.barY + geo.barH + 16}
            stroke={c.axis}
            strokeWidth={1.4}
          />
          <Path
            d={`M ${geo.barX + geo.barW - 7} ${geo.barY + geo.barH + 12}
                L ${geo.barX + geo.barW} ${geo.barY + geo.barH + 16}
                L ${geo.barX + geo.barW - 7} ${geo.barY + geo.barH + 20}`}
            stroke={c.axis}
            strokeWidth={1.4}
            fill="none"
          />
          <Line
            x1={geo.barX}
            y1={geo.barY - 18}
            x2={geo.barX + geo.barW}
            y2={geo.barY - 18}
            stroke={c.axis}
            strokeWidth={1.4}
          />
          <Path
            d={`M ${geo.barX + 7} ${geo.barY - 22} L ${geo.barX} ${geo.barY - 18}
                L ${geo.barX + 7} ${geo.barY - 14}`}
            stroke={c.axis}
            strokeWidth={1.4}
            fill="none"
          />
        </G>

        {/* ── Sweeping marker and its wave ─────────────────────────────────── */}
        {sweep > 0 ? (
          <G>
            <Line
              x1={markerX}
              y1={geo.barY - 8}
              x2={markerX}
              y2={geo.waveY + 24}
              stroke={c.highlight}
              strokeWidth={1.6}
              strokeDasharray="4 4"
            />
            <Circle cx={markerX} cy={geo.barY + geo.barH / 2} r={5} fill={c.highlight} />
            <Path d={wavePath} stroke={c.highlight} strokeWidth={2} fill="none" />
          </G>
        ) : null}

        {/* ── The visible band, expanded ───────────────────────────────────── */}
        {zoomIn > 0 ? (
          <G opacity={zoomIn}>
            {/* Guide lines from the sliver down to the expanded strip. */}
            <Line
              x1={visibleX0}
              y1={geo.barY + geo.barH + 6}
              x2={geo.barX}
              y2={geo.zoomY}
              stroke={c.grid}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <Line
              x1={visibleX1}
              y1={geo.barY + geo.barH + 6}
              x2={geo.barX + geo.barW}
              y2={geo.zoomY}
              stroke={c.grid}
              strokeWidth={1}
              strokeDasharray="3 4"
            />

            {VISIBLE_COLOURS.slice(0, -1).map((stop, i) => {
              const next = VISIBLE_COLOURS[i + 1];
              const x0 =
                geo.barX + ((stop.nm - 400) / (750 - 400)) * geo.barW;
              const x1 =
                geo.barX + ((next.nm - 400) / (750 - 400)) * geo.barW;
              return (
                <Rect
                  key={stop.nm}
                  x={x0}
                  y={geo.zoomY}
                  width={x1 - x0 + 1}
                  height={geo.zoomH}
                  fill={stop.colour}
                  opacity={0.92}
                />
              );
            })}
          </G>
        ) : null}
      </Svg>

      {/* ── Band labels ──────────────────────────────────────────────────── */}
      {BANDS.map((band) => {
        const x0 = xOfLog(band.logFrom);
        const x1 = xOfLog(band.logTo);
        // The visible band is too narrow to label in place — it gets its own
        // callout below instead, which is itself part of the point.
        if (x1 - x0 < 28) return null;
        return (
          <SceneLabel
            key={band.labelSi}
            x={(x0 + x1) / 2}
            y={geo.barY + geo.barH + 22}
            text={band.labelSi}
            color={c.label}
            opacity={barIn}
            size={9}
            maxWidth={x1 - x0 + 20}
          />
        );
      })}

      <SceneLabel
        x={geo.barX + geo.barW * 0.5}
        y={geo.barY - 34}
        text="ν (සංඛ්‍යාතය) වැඩි වේ  ←          →  λ (තරංග ආයාමය) වැඩි වේ"
        color={c.label}
        opacity={barIn}
        size={9}
        maxWidth={width * 0.9}
      />

      <SceneLabel
        x={visibleX0}
        y={geo.barY - 52}
        text="දෘශ්‍ය කලාපය"
        color={c.labelStrong}
        opacity={barIn}
        size={10}
        bold
        maxWidth={110}
      />

      <SceneLabel
        x={width * 0.5}
        y={geo.waveY + 30}
        text="λ දික් වන විට ν අඩු වේ — c = λν"
        color={c.highlight}
        opacity={segment(time, 6, 7) * (1 - zoomIn)}
        size={11}
        bold
        maxWidth={width * 0.8}
      />

      <SceneLabel
        x={geo.barX}
        y={geo.zoomY + geo.zoomH + 4}
        text="400 nm"
        color={c.label}
        opacity={zoomIn}
        size={9}
        anchor="start"
        maxWidth={54}
      />
      <SceneLabel
        x={geo.barX + geo.barW - 48}
        y={geo.zoomY + geo.zoomH + 4}
        text="750 nm"
        color={c.label}
        opacity={zoomIn}
        size={9}
        anchor="start"
        maxWidth={54}
      />

      <SceneLabel
        x={width * 0.5}
        y={height * 0.92}
        text="මුළු වර්ණාවලියෙන් අප දකින්නේ ~2%ක් පමණි — ඉතිරිය ඇසට නොපෙනේ"
        color={c.labelStrong}
        opacity={conclusionIn}
        size={11}
        bold
        maxWidth={width * 0.94}
      />
    </View>
  );
}
