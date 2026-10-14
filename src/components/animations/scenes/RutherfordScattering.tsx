import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import {
  clamp,
  easeOut,
  project,
  pulse,
  rad,
  seeded,
  segment,
} from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * 1.1.4 — රදර්ෆෝඩ්ගේ රන්පත් පරීක්ෂාව (Rutherford's gold foil experiment).
 *
 * The single most examined experiment in this unit, and the one where a static
 * textbook figure fails hardest: the whole argument is that *three different
 * outcomes* happen to *identical particles*, and the only thing that differs is
 * how close each one passed to a nucleus. A still image has to draw the three
 * paths side by side as if they were three separate experiments. Watching them
 * fly from one beam makes the causal link — small impact parameter, large
 * deflection — visible instead of asserted.
 *
 * ## The physics is real, not decorative
 *
 * Each α particle carries an **impact parameter** `b` (its perpendicular offset
 * from the nucleus). The deflection angle comes from the Rutherford scattering
 * relation:
 *
 *     tan(θ / 2) = k / b        →      θ = 2 · arctan(k / b)
 *
 * where `k` plays the role of half the distance of closest approach. So the
 * behaviour is not scripted per particle — it *emerges*: particles with large
 * `b` barely bend, and as `b` → 0 the angle approaches 180°. A student can be
 * asked "why did that one come back?" and the answer is in the geometry rather
 * than in a hand-drawn path.
 *
 * The detector hit point is solved exactly, intersecting each particle's ray
 * with the circular ZnS screen, so flashes land where the geometry puts them.
 */

/** Controls how sharply deflection grows as b → 0. In px, tuned for legibility. */
const K_SCATTER = 5.5;

/** Path speed in px/s. Slow enough to follow a single particle by eye. */
const SPEED = 190;

interface Particle {
  id: number;
  /** Signed perpendicular offset at the foil, in px. Sign = which side. */
  b: number;
  launchAt: number;
  /** Stage this particle belongs to, so stages can introduce their own group. */
  group: 0 | 1 | 2;
}

/**
 * The beam, built once per canvas size.
 *
 * Composition is chosen to match the syllabus observation counts rather than to
 * look busy: an overwhelming majority pass effectively straight through, a small
 * number deflect noticeably, and exactly one comes back. Those three groups are
 * literally the three observations a structured question asks about.
 */
function buildBeam(radius: number): Particle[] {
  const particles: Particle[] = [];
  let id = 0;

  // Group 0 — the majority. Large impact parameters, so θ stays a few degrees.
  for (let i = 0; i < 16; i += 1) {
    const spread = 0.22 + seeded(i * 3 + 1) * 0.78; // 0.22..1.0 of the aperture
    const side = i % 2 === 0 ? 1 : -1;
    particles.push({
      id: id++,
      b: side * spread * radius * 0.62,
      launchAt: 4.2 + i * 0.28,
      group: 0,
    });
  }

  // Group 1 — the few that deflect. b small enough for a visible angle.
  const closeOffsets = [14, -10, 19, -16, 11];
  closeOffsets.forEach((b, i) => {
    particles.push({ id: id++, b, launchAt: 10.4 + i * 0.9, group: 1 });
  });

  // Group 2 — the one that bounces back. b ≈ 0 → θ ≈ 180°.
  particles.push({ id: id++, b: 1.1, launchAt: 15.6, group: 2 });

  return particles;
}

/** θ from the Rutherford relation. Signed so the particle deflects outward. */
function deflectionAngle(b: number): number {
  const magnitude = (2 * Math.atan(K_SCATTER / Math.abs(b)) * 180) / Math.PI;
  return Math.sign(b) * magnitude;
}

/**
 * Distance along the deflected ray at which it meets the detector circle.
 *
 * Exact solution of |P₀ + s·û| = R, with P₀ = (0, b) relative to the foil centre.
 * Returned as a distance so the caller can compare it against how far the
 * particle has already travelled.
 */
function distanceToScreen(b: number, angleDeg: number, radius: number): number {
  const a = rad(angleDeg);
  const dot = b * Math.sin(a); // P₀ · û
  const disc = dot * dot + radius * radius - b * b;
  if (disc <= 0) return radius;
  return -dot + Math.sqrt(disc);
}

export function RutherfordScattering({
  t,
  width,
  height,
  isDark,
  reduceMotion,
}: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const cx = width * 0.54;
    const cy = height * 0.5;
    const radius = Math.min(width * 0.42, height * 0.44);
    return {
      cx,
      cy,
      radius,
      sourceX: width * 0.05,
      foilHalf: radius * 0.55,
      beamLength: cx - width * 0.05,
    };
  }, [width, height]);

  const beam = useMemo(() => buildBeam(geo.radius), [geo.radius]);

  // Reduce motion: jump to the moment all three outcomes have been seen, so the
  // student gets the complete diagram with no movement.
  const time = reduceMotion ? 19.5 : t;

  const appear = easeOut(segment(time, 0, 1.6));
  const foilIn = easeOut(segment(time, 1.2, 2.4));
  const nucleiIn = easeOut(segment(time, 13.2, 14.4)); // revealed only at the explanation
  const conclusionIn = easeOut(segment(time, 20.2, 21.4));

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── Detector screen: the circular ZnS fluorescent screen ─────────── */}
        <Circle
          cx={geo.cx}
          cy={geo.cy}
          r={geo.radius}
          stroke={c.axis}
          strokeWidth={2}
          strokeDasharray="6 5"
          fill="none"
          opacity={appear * 0.9}
        />

        {/* ── α source and collimator ──────────────────────────────────────── */}
        <G opacity={appear}>
          <Rect
            x={geo.sourceX - 26}
            y={geo.cy - 15}
            width={26}
            height={30}
            rx={5}
            fill={c.muted}
          />
          <Rect
            x={geo.sourceX}
            y={geo.cy - 4}
            width={14}
            height={8}
            fill={c.beam}
            opacity={0.85}
          />
        </G>

        {/* ── Gold foil, edge-on ───────────────────────────────────────────── */}
        <G opacity={foilIn}>
          <Rect
            x={geo.cx - 2.5}
            y={geo.cy - geo.foilHalf}
            width={5}
            height={geo.foilHalf * 2}
            rx={2}
            fill="#D4A017"
          />
          {/* Gold nuclei, revealed once the explanation stage is reached — the
              point is that the student first sees the *result*, then the cause. */}
          {nucleiIn > 0
            ? Array.from({ length: 7 }, (_, i) => (
                <Circle
                  key={`n${i}`}
                  cx={geo.cx}
                  cy={geo.cy - geo.foilHalf + ((i + 0.5) * geo.foilHalf * 2) / 7}
                  r={2.6}
                  fill={c.nucleus}
                  opacity={nucleiIn}
                />
              ))
            : null}
        </G>

        {/* ── Particles ────────────────────────────────────────────────────── */}
        {beam.map((p) => {
          const elapsed = time - p.launchAt;
          if (elapsed <= 0) return null;

          const travelled = elapsed * SPEED;
          const theta = deflectionAngle(p.b);
          const entryY = geo.cy + p.b;
          const toScreen = distanceToScreen(p.b, theta, geo.radius);
          const totalPath = geo.beamLength + toScreen;

          const hit = travelled >= totalPath;
          const d = Math.min(travelled, totalPath);

          let x: number;
          let y: number;
          if (d <= geo.beamLength) {
            x = geo.sourceX + d;
            y = entryY;
          } else {
            const after = project(geo.cx, entryY, theta, d - geo.beamLength);
            x = after.x;
            y = after.y;
          }

          // Trail: a short segment behind the particle along its current leg.
          const trail = 26;
          const tailD = Math.max(0, d - trail);
          let tx: number;
          let ty: number;
          if (tailD <= geo.beamLength) {
            tx = geo.sourceX + tailD;
            ty = entryY;
          } else {
            const tail = project(geo.cx, entryY, theta, tailD - geo.beamLength);
            tx = tail.x;
            ty = tail.y;
          }

          // Colour encodes the observation group, matching the conclusion rows.
          const colour =
            p.group === 2 ? c.danger : p.group === 1 ? c.highlight : c.beam;

          // Once it hits, the particle is gone and only the flash remains.
          const flashAge = hit ? (travelled - totalPath) / SPEED : 0;
          const flash = hit ? clamp(1 - flashAge / 1.1) : 0;

          return (
            <G key={p.id}>
              {!hit ? (
                <>
                  <Line
                    x1={tx}
                    y1={ty}
                    x2={x}
                    y2={y}
                    stroke={colour}
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.45}
                  />
                  <Circle cx={x} cy={y} r={3.4} fill={colour} />
                </>
              ) : null}

              {flash > 0 ? (
                <Circle
                  cx={x}
                  cy={y}
                  r={4 + (1 - flash) * 7}
                  fill={colour}
                  opacity={flash * 0.75}
                />
              ) : null}
            </G>
          );
        })}

        {/* ── Explanation overlay: why the close one came back ─────────────── */}
        {nucleiIn > 0 && conclusionIn < 0.5 ? (
          <G opacity={nucleiIn * (1 - conclusionIn * 2)}>
            {/* Repulsion field around the struck nucleus. */}
            <Circle
              cx={geo.cx}
              cy={geo.cy}
              r={16 + pulse(time, 14, 19) * 8}
              stroke={c.danger}
              strokeWidth={1.5}
              strokeDasharray="3 4"
              fill="none"
              opacity={0.7}
            />
          </G>
        ) : null}

        {/* ── Conclusions: three observation → conclusion rows ─────────────── */}
        {conclusionIn > 0 ? (
          <G opacity={conclusionIn}>
            <Rect
              x={width * 0.06}
              y={height * 0.08}
              width={width * 0.88}
              height={height * 0.84}
              rx={14}
              fill={isDark ? 'rgba(15,16,32,0.93)' : 'rgba(255,255,255,0.95)'}
              stroke={c.grid}
              strokeWidth={1}
            />
            {[0, 1, 2].map((i) => {
              const rowY = height * (0.3 + i * 0.2);
              const tone = i === 0 ? c.beam : i === 1 ? c.highlight : c.danger;
              return (
                <G key={`row${i}`}>
                  <Circle cx={width * 0.13} cy={rowY} r={5} fill={tone} />
                  <Path
                    d={`M ${width * 0.42} ${rowY} L ${width * 0.5} ${rowY}`}
                    stroke={c.axis}
                    strokeWidth={1.5}
                  />
                  <Path
                    d={`M ${width * 0.485} ${rowY - 3.5} L ${width * 0.5} ${rowY} L ${width * 0.485} ${rowY + 3.5}`}
                    stroke={c.axis}
                    strokeWidth={1.5}
                    fill="none"
                  />
                </G>
              );
            })}
          </G>
        ) : null}
      </Svg>

      {/* ── Sinhala labels, rendered as RN text over the canvas ───────────── */}
      <SceneLabel
        x={geo.sourceX - 14}
        y={geo.cy + 22}
        text="α ප්‍රභවය"
        color={c.label}
        opacity={appear * (1 - conclusionIn)}
        size={10}
        maxWidth={90}
      />
      <SceneLabel
        x={geo.cx}
        y={geo.cy - geo.foilHalf - 22}
        text="තුනී රන් තලය"
        color={c.label}
        opacity={foilIn * (1 - conclusionIn)}
        size={10}
        maxWidth={110}
      />
      <SceneLabel
        x={geo.cx}
        y={geo.cy + geo.radius + 8}
        text="ප්‍රතිදීප්ත තිරය (ZnS)"
        color={c.label}
        opacity={appear * (1 - conclusionIn)}
        size={10}
        maxWidth={150}
      />
      <SceneLabel
        x={geo.cx}
        y={geo.cy - geo.foilHalf - 6}
        text="රන් න්‍යෂ්ටි"
        color={c.nucleus}
        opacity={nucleiIn * (1 - conclusionIn)}
        size={10}
        bold
        maxWidth={100}
      />

      {conclusionIn > 0 ? (
        <>
          <SceneLabel
            x={width * 0.5}
            y={height * 0.14}
            text="නිරීක්ෂණ 3 → නිගමන 3"
            color={c.labelStrong}
            opacity={conclusionIn}
            size={13}
            bold
            maxWidth={width * 0.8}
          />
          {[
            {
              obs: 'බහුතරය කෙළින් ගියා',
              concl: 'පරමාණුව බොහෝ දුරට හිස් අවකාශයකි',
            },
            {
              obs: 'ස්වල්පයක් නැඹුරු වුණා',
              concl: 'මධ්‍යයේ ධන ආරෝපිත කොටසක් ඇත',
            },
            {
              obs: 'ඉතා ටිකක් ආපහු පැන්නා',
              concl: 'ධන ආරෝපණය හා ස්කන්ධය කුඩා ඝන න්‍යෂ්ටියක',
            },
          ].map((row, i) => {
            const rowY = height * (0.3 + i * 0.2);
            return (
              <View key={row.obs}>
                <SceneLabel
                  x={width * 0.17}
                  y={rowY - 14}
                  text={row.obs}
                  color={c.label}
                  opacity={conclusionIn}
                  size={10}
                  anchor="start"
                  maxWidth={width * 0.23}
                />
                <SceneLabel
                  x={width * 0.53}
                  y={rowY - 16}
                  text={row.concl}
                  color={c.labelStrong}
                  opacity={conclusionIn}
                  size={10}
                  bold
                  anchor="start"
                  maxWidth={width * 0.36}
                />
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}
