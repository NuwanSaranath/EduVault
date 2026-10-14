import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { easeInOut, easeOut, seeded, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.1 — පරමාණුවේ පරිමාණය (The scale of the atom).
 *
 * From the lesson's own image note: students read 10⁻¹⁰ m and 10⁻¹⁵ m without
 * feeling the gap between them. A side-by-side drawing cannot help, because the
 * nucleus at true scale would be smaller than one pixel — which is exactly the
 * point being made, and exactly why a still image cannot make it.
 *
 * A continuous zoom can. The magnification runs 1 → 10⁵ and **everything on
 * screen is drawn at true relative scale throughout**: the pitch is 10⁵ times the
 * ball, so the ball only becomes visible once the pitch has grown far beyond the
 * canvas. Nothing is fudged to make the ending arrive sooner.
 *
 * The long empty stretch in the middle is the content, not filler. Dust specks
 * are distributed *logarithmically* in world space so a new one drifts into view
 * at every decade of magnification — without them the zoom reads as a still
 * frame, and the emptiness stops registering as distance travelled.
 */

/** Diameter of an atom ÷ diameter of its nucleus. */
const SCALE_RATIO = 100_000;

const DUST_COUNT = 34;

export function AtomScale({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const cx = width * 0.5;
    const cy = height * 0.46;
    // World radius of the "pitch" at magnification 1.
    const pitchR = Math.min(width * 0.42, height * 0.38);
    return { cx, cy, pitchR };
  }, [width, height]);

  const time = reduceMotion ? 15 : t;

  /** Magnification, 1 → 10⁵, eased so the start and finish are not abrupt. */
  const zoom = 10 ** (5 * easeInOut(segment(time, 3, 13)));

  const pitchScreenR = geo.pitchR * zoom;
  const nucleusScreenR = (geo.pitchR / SCALE_RATIO) * zoom;

  const intro = easeOut(segment(time, 0, 1.4));
  const ratioIn = easeOut(segment(time, 14, 15.4));
  const exponent = 5 * easeInOut(segment(time, 3, 13));

  /**
   * Dust at logarithmically spaced world radii.
   *
   * A speck at world radius r becomes visible when r·zoom < canvas radius, so
   * spacing them by decade keeps one entering view throughout the whole zoom.
   */
  const dust = useMemo(
    () =>
      Array.from({ length: DUST_COUNT }, (_, i) => {
        const u = i / DUST_COUNT;
        return {
          id: i,
          worldR: geo.pitchR * 10 ** (-5 * u),
          angle: seeded(i * 7 + 3) * Math.PI * 2,
          size: 0.8 + seeded(i * 13) * 1.6,
        };
      }),
    [geo.pitchR],
  );

  const canvasR = Math.max(width, height);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── The stadium, drawn at true scale so it leaves the canvas ────── */}
        {pitchScreenR < canvasR * 6 ? (
          <G opacity={intro}>
            {/* Crowd ring */}
            <Circle
              cx={geo.cx}
              cy={geo.cy}
              r={pitchScreenR * 1.18}
              stroke={c.muted}
              strokeWidth={Math.min(10, pitchScreenR * 0.08)}
              fill="none"
              opacity={0.45}
            />
            {/* Outfield */}
            <Circle
              cx={geo.cx}
              cy={geo.cy}
              r={pitchScreenR}
              stroke={c.success}
              strokeWidth={2}
              fill={isDark ? 'rgba(34,197,94,0.07)' : 'rgba(34,197,94,0.10)'}
            />
            {/* The pitch strip, which keeps the stadium readable as it grows */}
            <Ellipse
              cx={geo.cx}
              cy={geo.cy}
              rx={pitchScreenR * 0.07}
              ry={pitchScreenR * 0.3}
              fill={c.muted}
              opacity={0.35}
            />
          </G>
        ) : null}

        {/* ── Dust: motion parallax through the empty middle ───────────────── */}
        {dust.map((speck) => {
          const r = speck.worldR * zoom;
          if (r > canvasR * 0.75 || r < 0.6) return null;
          // Fade in as it enters and out as it sweeps past the edge.
          const fade = Math.min(1, r / 14) * Math.min(1, (canvasR * 0.75 - r) / 60);
          return (
            <Circle
              key={speck.id}
              cx={geo.cx + Math.cos(speck.angle) * r}
              cy={geo.cy + Math.sin(speck.angle) * r}
              r={speck.size}
              fill={c.label}
              opacity={fade * 0.5}
            />
          );
        })}

        {/* ── The nucleus: sub-pixel until the magnification earns it ─────── */}
        {nucleusScreenR > 0.4 ? (
          <G>
            <Circle cx={geo.cx} cy={geo.cy} r={nucleusScreenR} fill={c.nucleus} />
            {/* Seam lines, so it reads as a cricket ball once large enough */}
            {nucleusScreenR > 18 ? (
              <>
                <Ellipse
                  cx={geo.cx}
                  cy={geo.cy}
                  rx={nucleusScreenR * 0.35}
                  ry={nucleusScreenR}
                  stroke={isDark ? '#7C2D12' : '#7F1D1D'}
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0.8}
                />
                <Line
                  x1={geo.cx - nucleusScreenR}
                  y1={geo.cy}
                  x2={geo.cx + nucleusScreenR}
                  y2={geo.cy}
                  stroke={isDark ? '#7C2D12' : '#7F1D1D'}
                  strokeWidth={1}
                  opacity={0.5}
                />
              </>
            ) : null}
          </G>
        ) : null}

        {/* ── Magnification readout bar ────────────────────────────────────── */}
        <G opacity={intro}>
          <Line
            x1={width * 0.08}
            y1={height * 0.93}
            x2={width * 0.92}
            y2={height * 0.93}
            stroke={c.grid}
            strokeWidth={2}
          />
          <Circle
            cx={width * 0.08 + (width * 0.84 * exponent) / 5}
            cy={height * 0.93}
            r={5}
            fill={c.highlight}
          />
        </G>
      </Svg>

      <SceneLabel
        x={width * 0.5}
        y={height * 0.04}
        text="ක්‍රිකට් පිටිය = පරමාණුව (⌀ ≈ 10⁻¹⁰ m)"
        color={c.labelStrong}
        opacity={intro * (1 - segment(time, 11.5, 12.5))}
        size={12}
        bold
        maxWidth={width * 0.9}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.04}
        text="ක්‍රිකට් බෝලය = න්‍යෂ්ටිය (⌀ ≈ 10⁻¹⁵ m)"
        color={c.nucleus}
        opacity={segment(time, 12.2, 13.2)}
        size={12}
        bold
        maxWidth={width * 0.9}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.16}
        text="අතර ඇත්තේ හිස් අවකාශයයි…"
        color={c.label}
        opacity={segment(time, 5.5, 6.5) * (1 - segment(time, 11.5, 12.3))}
        size={11}
        maxWidth={width * 0.8}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.86}
        text={`විශාලනය  ×10${superscript(exponent)}`}
        color={c.highlight}
        opacity={intro}
        size={11}
        bold
        maxWidth={width * 0.6}
      />

      <SceneLabel
        x={width * 0.5}
        y={height * 0.7}
        text={
          'පරමාණුවේ විෂ්කම්භය ÷ න්‍යෂ්ටියේ විෂ්කම්භය ≈ 10⁵\n' +
          'එනම් පදාර්ථය සැබැවින්ම බොහෝ දුරට හිස් අවකාශයකි'
        }
        color={c.labelStrong}
        opacity={ratioIn}
        size={11}
        bold
        maxWidth={width * 0.9}
      />
    </View>
  );
}

/** Renders an exponent to one decimal using Unicode superscript digits. */
function superscript(value: number): string {
  const digits = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  const fixed = value.toFixed(1);
  return fixed
    .split('')
    .map((ch) => (ch === '.' ? '·' : digits[Number(ch)] ?? ch))
    .join('');
}
