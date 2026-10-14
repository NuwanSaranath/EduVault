import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { easeOut, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.2 — ද බ්‍රොග්ලි සම්බන්ධය (The de Broglie relation).
 *
 * Built to answer the question the lesson says students actually ask:
 * *"එහෙනම් මගේ බෝලෙත් තරංගයක්ද?"* — "so is my cricket ball a wave too?"
 *
 * The honest answer is yes, and the reason nobody notices is a number. Both
 * objects are given the relation, both get a wavelength, and both wavelengths
 * are drawn **to the same scale**. The ball's is a flat line, not because it has
 * no wave nature but because 10⁻³⁴ m cannot be drawn next to 10⁻¹⁰ m. The
 * emptiness where the ball's wave should be is the explanation.
 */

/** Cricket ball: 160 g at 40 m s⁻¹ — a fast delivery. */
const BALL = { massKg: 0.16, velocity: 40, massText: '0.16 kg', velocityText: '40 m s⁻¹' };

/** Electron: rest mass at a typical 10⁶ m s⁻¹. */
const ELECTRON = {
  massKg: 9.11e-31,
  velocity: 1e6,
  massText: '9.11 × 10⁻³¹ kg',
  velocityText: '10⁶ m s⁻¹',
};

const PLANCK = 6.626e-34;

function wavelengthOf(massKg: number, velocity: number): number {
  return PLANCK / (massKg * velocity);
}

export function DeBroglie({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const columnW = width * 0.5;
    return {
      columnW,
      leftCx: columnW * 0.5,
      rightCx: columnW * 1.5,
      objectY: height * 0.26,
      formulaY: height * 0.46,
      waveY: height * 0.68,
    };
  }, [width, height]);

  const time = reduceMotion ? 15 : t;

  const objectsIn = easeOut(segment(time, 0, 1.6));
  const numbersIn = easeOut(segment(time, 4, 5.6));
  const ballWaveIn = easeOut(segment(time, 8, 9.4));
  const electronWaveIn = easeOut(segment(time, 11, 12.4));
  const conclusionIn = easeOut(segment(time, 14, 15.4));

  const ballLambda = wavelengthOf(BALL.massKg, BALL.velocity);
  const electronLambda = wavelengthOf(ELECTRON.massKg, ELECTRON.velocity);

  /**
   * Drawn wavelength in px, from a shared metres-per-pixel scale.
   *
   * Fixing the scale so the electron's wave is comfortably readable is what
   * forces the ball's wave to collapse to a line — the comparison only means
   * something because the *same* scale is applied to both.
   */
  const pxPerMetre = (geo.columnW * 0.42) / electronLambda;
  const ballWavePx = ballLambda * pxPerMetre; // ~1e-24 px: a straight line
  const electronWavePx = electronLambda * pxPerMetre;

  /** Sine path with the given wavelength, or a flat line when it is sub-pixel. */
  const wavePath = (cx: number, wavelengthPx: number, amplitude: number): string => {
    const x0 = cx - geo.columnW * 0.38;
    const x1 = cx + geo.columnW * 0.38;
    if (wavelengthPx < 1.5) return `M ${x0} ${geo.waveY} L ${x1} ${geo.waveY}`;
    let d = `M ${x0} ${geo.waveY}`;
    for (let x = x0; x <= x1; x += 2) {
      const y = geo.waveY - Math.sin(((x - x0) / wavelengthPx) * Math.PI * 2) * amplitude;
      d += ` L ${x} ${y}`;
    }
    return d;
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Divider between the two cases. */}
        <Line
          x1={width * 0.5}
          y1={height * 0.1}
          x2={width * 0.5}
          y2={height * 0.82}
          stroke={c.grid}
          strokeWidth={1}
          strokeDasharray="4 5"
          opacity={objectsIn}
        />

        {/* ── The cricket ball ─────────────────────────────────────────────── */}
        <G opacity={objectsIn}>
          <Circle cx={geo.leftCx} cy={geo.objectY} r={22} fill={c.nucleus} />
          <Ellipse
            cx={geo.leftCx}
            cy={geo.objectY}
            rx={8}
            ry={22}
            stroke={isDark ? '#7C2D12' : '#7F1D1D'}
            strokeWidth={1.5}
            fill="none"
          />
          {/* Velocity arrow — both objects get the relation, so both move. */}
          <Line
            x1={geo.leftCx + 30}
            y1={geo.objectY}
            x2={geo.leftCx + 56}
            y2={geo.objectY}
            stroke={c.label}
            strokeWidth={1.8}
          />
          <Path
            d={`M ${geo.leftCx + 50} ${geo.objectY - 4} L ${geo.leftCx + 56} ${geo.objectY}
                L ${geo.leftCx + 50} ${geo.objectY + 4}`}
            stroke={c.label}
            strokeWidth={1.8}
            fill="none"
          />
        </G>

        {/* ── The electron ─────────────────────────────────────────────────── */}
        <G opacity={objectsIn}>
          <Circle cx={geo.rightCx} cy={geo.objectY} r={7} fill={c.electron} />
          <Circle
            cx={geo.rightCx}
            cy={geo.objectY}
            r={13}
            stroke={c.electron}
            strokeWidth={1}
            strokeDasharray="2 3"
            fill="none"
            opacity={0.6}
          />
          <Line
            x1={geo.rightCx + 20}
            y1={geo.objectY}
            x2={geo.rightCx + 56}
            y2={geo.objectY}
            stroke={c.label}
            strokeWidth={1.8}
          />
          <Path
            d={`M ${geo.rightCx + 50} ${geo.objectY - 4} L ${geo.rightCx + 56} ${geo.objectY}
                L ${geo.rightCx + 50} ${geo.objectY + 4}`}
            stroke={c.label}
            strokeWidth={1.8}
            fill="none"
          />
        </G>

        {/* ── Waves, both at the same metres-per-pixel scale ───────────────── */}
        {ballWaveIn > 0 ? (
          <G opacity={ballWaveIn}>
            <Path
              d={wavePath(geo.leftCx, ballWavePx, 16)}
              stroke={c.nucleus}
              strokeWidth={2.2}
              fill="none"
            />
          </G>
        ) : null}

        {electronWaveIn > 0 ? (
          <G opacity={electronWaveIn}>
            <Path
              d={wavePath(geo.rightCx, electronWavePx, 16)}
              stroke={c.electron}
              strokeWidth={2.2}
              fill="none"
            />
            {/* λ measured off, so the visible wave is tied to a number. */}
            <Line
              x1={geo.rightCx - geo.columnW * 0.38}
              y1={geo.waveY + 26}
              x2={geo.rightCx - geo.columnW * 0.38 + electronWavePx}
              y2={geo.waveY + 26}
              stroke={c.electron}
              strokeWidth={1.4}
            />
          </G>
        ) : null}

        {/* ── The relation, centred between the two columns ────────────────── */}
        <G opacity={numbersIn}>
          <Rect
            x={width * 0.5 - 52}
            y={geo.formulaY - 16}
            width={104}
            height={32}
            rx={8}
            fill={isDark ? 'rgba(15,16,32,0.95)' : 'rgba(255,255,255,0.96)'}
            stroke={c.grid}
            strokeWidth={1}
          />
        </G>
      </Svg>

      <SceneLabel
        x={geo.leftCx}
        y={height * 0.04}
        text="ක්‍රිකට් බෝලය"
        color={c.labelStrong}
        opacity={objectsIn}
        size={12}
        bold
        maxWidth={geo.columnW * 0.9}
      />
      <SceneLabel
        x={geo.rightCx}
        y={height * 0.04}
        text="ඉලෙක්ට්‍රෝනය"
        color={c.labelStrong}
        opacity={objectsIn}
        size={12}
        bold
        maxWidth={geo.columnW * 0.9}
      />

      <SceneLabel
        x={geo.leftCx}
        y={geo.objectY + 34}
        text={`m = ${BALL.massText}\nv = ${BALL.velocityText}`}
        color={c.label}
        opacity={numbersIn}
        size={10}
        maxWidth={geo.columnW * 0.9}
      />
      <SceneLabel
        x={geo.rightCx}
        y={geo.objectY + 34}
        text={`m = ${ELECTRON.massText}\nv = ${ELECTRON.velocityText}`}
        color={c.label}
        opacity={numbersIn}
        size={10}
        maxWidth={geo.columnW * 0.9}
      />

      <SceneLabel
        x={width * 0.5}
        y={geo.formulaY - 8}
        text="λ = h / mv"
        color={c.highlight}
        opacity={numbersIn}
        size={13}
        bold
        maxWidth={110}
      />

      <SceneLabel
        x={geo.leftCx}
        y={geo.waveY - 54}
        text="λ ≈ 1.0 × 10⁻³⁴ m"
        color={c.nucleus}
        opacity={ballWaveIn}
        size={11}
        bold
        maxWidth={geo.columnW * 0.9}
      />
      <SceneLabel
        x={geo.leftCx}
        y={geo.waveY + 20}
        text="තරංගය ඇත — නමුත් මැනිය නොහැකි තරම් කුඩායි"
        color={c.label}
        opacity={ballWaveIn}
        size={9}
        maxWidth={geo.columnW * 0.92}
      />

      <SceneLabel
        x={geo.rightCx}
        y={geo.waveY - 54}
        text="λ ≈ 7.3 × 10⁻¹⁰ m"
        color={c.electron}
        opacity={electronWaveIn}
        size={11}
        bold
        maxWidth={geo.columnW * 0.9}
      />
      <SceneLabel
        x={geo.rightCx}
        y={geo.waveY + 34}
        text="පරමාණුවක තරමට සමානයි → මැනිය හැකියි"
        color={c.label}
        opacity={electronWaveIn}
        size={9}
        maxWidth={geo.columnW * 0.92}
      />

      <SceneLabel
        x={width * 0.5}
        y={height * 0.9}
        text={
          'ඔව් — ඔබේ බෝලයටත් තරංග ස්වභාවයක් ඇත.\n' +
          'm විශාල නිසා λ කුඩා වී, දෛනික වස්තූන්ට එය කිසිසේත් නොදැනේ.'
        }
        color={c.labelStrong}
        opacity={conclusionIn}
        size={11}
        bold
        maxWidth={width * 0.94}
      />
    </View>
  );
}
