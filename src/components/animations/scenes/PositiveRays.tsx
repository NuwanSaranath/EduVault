import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { clamp, easeOut, lerp, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.1.3 — ධන කිරණවල ගුණ (Properties of positive rays).
 *
 * The comparison the cathode-ray animation's final stage points at, and a
 * frequent structured-question target: **cathode rays have a fixed e/m whatever
 * the gas; positive rays do not.** That single contrast is what proves the
 * electron is a universal constituent of all matter while the positive particle
 * is just whatever ion the gas happened to give.
 *
 * Two tubes run the same experiment side by side and the gas is swapped three
 * times. The top beam never changes. The bottom beam deflects less with every
 * heavier gas — and because deflection here is *computed from* e/m rather than
 * drawn by hand, "heavier ion → smaller e/m → smaller deflection" is visible as
 * a single causal chain.
 */

interface GasCase {
  labelSi: string;
  formula: string;
  /** e/m for the positive ion of this gas, in C g⁻¹. */
  positiveEm: number;
  positiveEmText: string;
}

/** Cathode rays are the same particle every time, so this never varies. */
const ELECTRON_EM = 1.76e8;
const ELECTRON_EM_TEXT = '1.76 × 10⁸';

const GASES: GasCase[] = [
  {
    labelSi: 'හයිඩ්‍රජන්',
    formula: 'H₂',
    positiveEm: 9.58e4,
    positiveEmText: '9.58 × 10⁴',
  },
  {
    labelSi: 'හීලියම්',
    formula: 'He',
    positiveEm: 2.4e4,
    positiveEmText: '2.40 × 10⁴',
  },
  {
    labelSi: 'නියෝන්',
    formula: 'Ne',
    positiveEm: 4.79e3,
    positiveEmText: '4.79 × 10³',
  },
];

/** When each gas is in the tube. */
const GAS_AT = [4, 9, 13];

/**
 * Deflection as a fraction of the tube's half-height.
 *
 * e/m spans four orders of magnitude between an electron and a neon ion, so a
 * linear mapping would pin every positive ray to zero and destroy the very
 * comparison being taught. Log scaling keeps all four distinguishable while
 * preserving the ordering, which is what the student must take away.
 */
function deflectionOf(em: number): number {
  const lo = Math.log10(1e3);
  const hi = Math.log10(2e8);
  return clamp((Math.log10(em) - lo) / (hi - lo)) * 0.82;
}

export function PositiveRays({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const tubeH = Math.min(height * 0.2, 70);
    return {
      tubeH,
      left: width * 0.06,
      right: width * 0.7,
      topCy: height * 0.26,
      bottomCy: height * 0.64,
      dialX: width * 0.74,
      dialW: width * 0.2,
    };
  }, [width, height]);

  const time = reduceMotion ? 16 : t;

  const appear = easeOut(segment(time, 0, 1.4));

  /** Index of the gas currently in the tube; −1 before the first is admitted. */
  const gasIndex = GAS_AT.reduce((acc, at, i) => (time >= at ? i : acc), -1);
  const gas = gasIndex >= 0 ? GASES[gasIndex] : null;

  /**
   * Deflection eases between gases rather than snapping, so the *change* is what
   * catches the eye — a snap reads as a redraw, a slide reads as a consequence.
   */
  const positiveDeflect = ((): number => {
    if (gasIndex < 0) return 0;
    const from = gasIndex === 0 ? 0 : deflectionOf(GASES[gasIndex - 1].positiveEm);
    const to = deflectionOf(gas!.positiveEm);
    const swap = segment(time, GAS_AT[gasIndex], GAS_AT[gasIndex] + 1.2);
    return lerp(gasIndex === 0 ? to : from, to, gasIndex === 0 ? 1 : swap) * (gasIndex === 0 ? swap : 1);
  })();

  const electronDeflect = deflectionOf(ELECTRON_EM) * segment(time, 4, 5.2);
  const conclusionIn = easeOut(segment(time, 15, 16.4));

  /** One tube: envelope, electrodes, and a beam bending by `deflect`. */
  const renderTube = (
    cy: number,
    deflect: number,
    beamColour: string,
    /** Cathode rays run left→right; positive rays run right→left. */
    reversed: boolean,
  ) => {
    const half = geo.tubeH / 2;
    const x0 = reversed ? geo.right : geo.left;
    const x1 = reversed ? geo.left : geo.right;
    const span = x1 - x0;

    // Parabolic inside the plates, straight after — same physics as the CRT scene.
    const p0 = x0 + span * 0.38;
    const p1 = x0 + span * 0.66;
    const drop = half * deflect;

    const yAt = (x: number): number => {
      const through = (x - x0) / span;
      const a = (p0 - x0) / span;
      const b = (p1 - x0) / span;
      if (through <= a) return cy;
      if (through <= b) {
        const u = (through - a) / (b - a);
        return cy - drop * u * u;
      }
      const exitY = cy - drop;
      const slope = ((-2 * drop) / (b - a)) * (1 / span);
      return exitY + slope * (x - p1) * (reversed ? -1 : 1);
    };

    const steps = 20;
    let d = `M ${x0} ${cy}`;
    for (let s = 1; s <= steps; s += 1) {
      const x = lerp(x0, x1, s / steps);
      d += ` L ${x} ${yAt(x)}`;
    }

    return (
      <G>
        <Rect
          x={geo.left}
          y={cy - half}
          width={geo.right - geo.left}
          height={geo.tubeH}
          rx={half * 0.5}
          stroke={c.axis}
          strokeWidth={1.8}
          fill={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
        />

        {/* Deflecting plates */}
        <Rect
          x={Math.min(p0, p1)}
          y={cy - half * 0.95}
          width={Math.abs(p1 - p0)}
          height={4}
          fill={c.proton}
          opacity={0.85}
        />
        <Rect
          x={Math.min(p0, p1)}
          y={cy + half * 0.75}
          width={Math.abs(p1 - p0)}
          height={4}
          fill={c.electron}
          opacity={0.85}
        />

        {deflect > 0.001 ? (
          <>
            <Path d={d} stroke={beamColour} strokeWidth={2.2} fill="none" opacity={0.75} />
            <Circle cx={x1} cy={yAt(x1)} r={4} fill={beamColour} />
          </>
        ) : null}
      </G>
    );
  };

  /** A log-scaled bar for an e/m value. */
  const renderDial = (cy: number, em: number, colour: string, shown: number) => {
    const frac = deflectionOf(em) / 0.82;
    return (
      <G opacity={shown}>
        <Rect
          x={geo.dialX}
          y={cy - 7}
          width={geo.dialW}
          height={14}
          rx={7}
          fill={c.grid}
          opacity={0.55}
        />
        <Rect
          x={geo.dialX}
          y={cy - 7}
          width={geo.dialW * frac}
          height={14}
          rx={7}
          fill={colour}
        />
      </G>
    );
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <G opacity={appear}>{renderTube(geo.topCy, electronDeflect, c.electron, false)}</G>
        <G opacity={appear}>{renderTube(geo.bottomCy, positiveDeflect, c.proton, true)}</G>

        {/* Perforated cathode: the holes are what let positive rays through, so
            they are drawn rather than implied. */}
        <G opacity={appear}>
          {[0.3, 0.5, 0.7].map((f) => (
            <Line
              key={f}
              x1={geo.left + (geo.right - geo.left) * 0.22}
              y1={geo.bottomCy - geo.tubeH / 2 + geo.tubeH * f - 4}
              x2={geo.left + (geo.right - geo.left) * 0.22}
              y2={geo.bottomCy - geo.tubeH / 2 + geo.tubeH * f + 4}
              stroke={c.bg}
              strokeWidth={3}
            />
          ))}
          <Rect
            x={geo.left + (geo.right - geo.left) * 0.22 - 3}
            y={geo.bottomCy - geo.tubeH / 2}
            width={6}
            height={geo.tubeH}
            fill={c.muted}
            opacity={0.7}
          />
        </G>

        {renderDial(geo.topCy, ELECTRON_EM, c.electron, electronDeflect > 0 ? 1 : 0)}
        {gas ? renderDial(geo.bottomCy, gas.positiveEm, c.proton, 1) : null}
      </Svg>

      <SceneLabel
        x={geo.left}
        y={geo.topCy - geo.tubeH / 2 - 20}
        text="කැතෝඩ කිරණ (ඉලෙක්ට්‍රෝන)"
        color={c.electron}
        opacity={appear}
        size={11}
        bold
        anchor="start"
        maxWidth={width * 0.6}
      />
      <SceneLabel
        x={geo.left}
        y={geo.bottomCy - geo.tubeH / 2 - 20}
        text="ධන කිරණ (ගෑස් අයන)"
        color={c.proton}
        opacity={appear}
        size={11}
        bold
        anchor="start"
        maxWidth={width * 0.6}
      />

      <SceneLabel
        x={geo.dialX}
        y={geo.topCy + 12}
        text={`e/m = ${ELECTRON_EM_TEXT}`}
        color={c.electron}
        opacity={electronDeflect > 0 ? 1 : 0}
        size={9}
        anchor="start"
        maxWidth={geo.dialW + 10}
      />
      {gas ? (
        <SceneLabel
          x={geo.dialX}
          y={geo.bottomCy + 12}
          text={`e/m = ${gas.positiveEmText}`}
          color={c.proton}
          opacity={1}
          size={9}
          anchor="start"
          maxWidth={geo.dialW + 10}
        />
      ) : null}

      {gas ? (
        <SceneLabel
          x={width * 0.5}
          y={height * 0.44}
          text={`නලයේ ගෑසය: ${gas.labelSi}  (${gas.formula})`}
          color={c.labelStrong}
          opacity={1}
          size={12}
          bold
          maxWidth={width * 0.8}
        />
      ) : null}

      <SceneLabel
        x={width * 0.5}
        y={height * 0.88}
        text={
          'ඉහළ නළය කිසිදා වෙනස් නොවේ · පහළ නළය සෑම ගෑසයකට ම වෙනස් වේ\n' +
          'කැතෝඩ කිරණ = සර්වසාධාරණ ඉලෙක්ට්‍රෝනය · ධන කිරණ = එම ගෑසයේ අයනය'
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
