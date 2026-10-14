import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { clamp, easeOut, lerp, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * 1.1.1 — කැතෝඩ කිරණවල ගුණ (Properties of cathode rays).
 *
 * The syllabus lists four properties of cathode rays, and each was established
 * by a *different* modification of the same tube. A static figure has to show
 * four tubes; this shows one tube being modified four times, which is what
 * actually happened and what makes the sequence memorable.
 *
 *   Stage 1  Maltese cross → a sharp shadow      → rays travel in straight lines
 *   Stage 2  paddle wheel → it turns             → the rays carry momentum (mass)
 *   Stage 3  charged plates → beam bends to (+)  → the rays are negative
 *   Stage 4  swap gas and cathode metal → e/m unchanged → the electron is universal
 *
 * Stage 4 is the one students skip and examiners ask about: it is the step that
 * turns "a beam in a tube" into "a particle present in all matter", and it is
 * the contrast with *positive* rays (whose e/m does change with the gas) that
 * questions are built on.
 */

/** Beam travel speed in px/s for the moving markers. */
const SPEED = 210;

/** Vertical deflection inside the plates, as a fraction of tube half-height. */
const DEFLECT = 0.62;

export function CathodeRayTube({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const cy = height * 0.45;
    const halfH = Math.min(height * 0.24, 84);
    return {
      cy,
      halfH,
      left: width * 0.06,
      right: width * 0.94,
      cathodeX: width * 0.13,
      anodeX: width * 0.29,
      objectX: width * 0.56,
      screenX: width * 0.88,
    };
  }, [width, height]);

  // Reduce motion lands on the conclusion, where all four results are listed.
  const time = reduceMotion ? 25 : t;

  const appear = easeOut(segment(time, 0, 1.4));
  const crossIn = easeOut(segment(time, 3.4, 4.4)) * (1 - segment(time, 9.2, 10));
  const wheelIn = easeOut(segment(time, 10.2, 11.2)) * (1 - segment(time, 15.4, 16.2));
  const platesIn = easeOut(segment(time, 16.4, 17.4)) * (1 - segment(time, 22.4, 23.2));
  const swapIn = easeOut(segment(time, 23.4, 24.4));
  const beamOn = easeOut(segment(time, 2.2, 3.2));

  /** Wheel rotation only accumulates while the beam is actually striking it. */
  const wheelSpin = clamp(segment(time, 11.6, 15.4)) * 900;

  /** Plate deflection ramps in so the cause (voltage) precedes the effect. */
  const deflect = easeOut(segment(time, 18.0, 19.6)) * (platesIn > 0 ? 1 : 0);

  const beamTop = geo.cy - geo.halfH * 0.34;
  const beamBottom = geo.cy + geo.halfH * 0.34;

  /**
   * Vertical position of the beam at a given x.
   *
   * Straight until the plates, parabolic between them (constant transverse
   * force on a constant forward velocity), then straight again on the exit
   * tangent. That is the real trajectory, and drawing it as a single bend
   * instead is the most common error in textbook figures.
   */
  const beamY = (x: number, y0: number): number => {
    if (deflect <= 0) return y0;
    const p0 = geo.objectX - width * 0.07;
    const p1 = geo.objectX + width * 0.07;
    const drop = geo.halfH * DEFLECT * deflect;

    if (x <= p0) return y0;
    if (x <= p1) {
      const u = (x - p0) / (p1 - p0);
      return y0 - drop * u * u; // upward, toward the positive plate
    }
    const exitY = y0 - drop;
    const slope = (-2 * drop) / (p1 - p0);
    return exitY + slope * (x - p1);
  };

  const rays = [beamTop, geo.cy, beamBottom];

  /** Marker x position, looped so the beam reads as continuous. */
  const markerX = (offset: number): number => {
    const span = geo.screenX - geo.anodeX;
    const travelled = (time * SPEED + offset) % span;
    return geo.anodeX + travelled;
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* ── Tube envelope ────────────────────────────────────────────────── */}
        <Rect
          x={geo.left}
          y={geo.cy - geo.halfH}
          width={geo.right - geo.left}
          height={geo.halfH * 2}
          rx={geo.halfH * 0.55}
          stroke={c.axis}
          strokeWidth={2}
          fill={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
          opacity={appear}
        />

        {/* ── Cathode (−) and anode (+) with its collimating slit ──────────── */}
        <G opacity={appear}>
          <Rect
            x={geo.cathodeX - 5}
            y={geo.cy - geo.halfH * 0.5}
            width={7}
            height={geo.halfH}
            rx={2}
            fill={swapIn > 0.5 ? c.success : c.electron}
          />
          <Rect
            x={geo.anodeX}
            y={geo.cy - geo.halfH * 0.62}
            width={6}
            height={geo.halfH * 0.42}
            fill={c.proton}
          />
          <Rect
            x={geo.anodeX}
            y={geo.cy + geo.halfH * 0.2}
            width={6}
            height={geo.halfH * 0.42}
            fill={c.proton}
          />
        </G>

        {/* ── The beam ─────────────────────────────────────────────────────── */}
        {beamOn > 0
          ? rays.map((y0, i) => {
              // The cross blocks the middle ray — that gap is the shadow.
              const blocked = crossIn > 0.5 && i === 1;
              const endX = blocked ? geo.objectX - 10 : geo.screenX;

              const steps = 22;
              let d = `M ${geo.anodeX + 6} ${y0}`;
              for (let s = 1; s <= steps; s += 1) {
                const x = lerp(geo.anodeX + 6, endX, s / steps);
                d += ` L ${x} ${beamY(x, y0)}`;
              }

              return (
                <Path
                  key={`ray${i}`}
                  d={d}
                  stroke={c.electron}
                  strokeWidth={2}
                  fill="none"
                  opacity={beamOn * 0.5}
                />
              );
            })
          : null}

        {/* Moving markers make the direction of travel unambiguous. */}
        {beamOn > 0
          ? [0, 70, 140, 210].map((offset) => {
              const x = markerX(offset);
              if (crossIn > 0.5 && x > geo.objectX - 10) return null;
              return (
                <Circle
                  key={`m${offset}`}
                  cx={x}
                  cy={beamY(x, geo.cy)}
                  r={3}
                  fill={c.electron}
                  opacity={beamOn}
                />
              );
            })
          : null}

        {/* ── Stage 1: Maltese cross and its shadow ────────────────────────── */}
        {crossIn > 0 ? (
          <G opacity={crossIn}>
            <Rect
              x={geo.objectX - 4}
              y={geo.cy - geo.halfH * 0.34}
              width={8}
              height={geo.halfH * 0.68}
              fill={c.muted}
            />
            <Rect
              x={geo.objectX - geo.halfH * 0.22}
              y={geo.cy - 4}
              width={geo.halfH * 0.44}
              height={8}
              fill={c.muted}
            />
            {/* The shadow: the screen glows except where the cross blocked it. */}
            <Rect
              x={geo.screenX - 3}
              y={geo.cy - geo.halfH * 0.34}
              width={7}
              height={geo.halfH * 0.68}
              fill={c.success}
              opacity={0.35}
            />
            <Rect
              x={geo.screenX - 3}
              y={geo.cy - 5}
              width={7}
              height={10}
              fill={isDark ? '#000' : '#333'}
              opacity={0.85}
            />
          </G>
        ) : null}

        {/* ── Stage 2: paddle wheel turned by the beam ─────────────────────── */}
        {wheelIn > 0 ? (
          <G opacity={wheelIn}>
            <Circle
              cx={geo.objectX}
              cy={geo.cy}
              r={geo.halfH * 0.34}
              stroke={c.muted}
              strokeWidth={2}
              fill="none"
            />
            <G
              origin={`${geo.objectX}, ${geo.cy}`}
              rotation={wheelSpin}
            >
              {[0, 60, 120].map((a) => (
                <Line
                  key={a}
                  x1={geo.objectX - Math.cos((a * Math.PI) / 180) * geo.halfH * 0.34}
                  y1={geo.cy - Math.sin((a * Math.PI) / 180) * geo.halfH * 0.34}
                  x2={geo.objectX + Math.cos((a * Math.PI) / 180) * geo.halfH * 0.34}
                  y2={geo.cy + Math.sin((a * Math.PI) / 180) * geo.halfH * 0.34}
                  stroke={c.muted}
                  strokeWidth={2.5}
                />
              ))}
            </G>
          </G>
        ) : null}

        {/* ── Stage 3: deflecting plates ───────────────────────────────────── */}
        {platesIn > 0 ? (
          <G opacity={platesIn}>
            <Rect
              x={geo.objectX - width * 0.07}
              y={geo.cy - geo.halfH * 0.78}
              width={width * 0.14}
              height={7}
              rx={2}
              fill={c.proton}
            />
            <Rect
              x={geo.objectX - width * 0.07}
              y={geo.cy + geo.halfH * 0.66}
              width={width * 0.14}
              height={7}
              rx={2}
              fill={c.electron}
            />
          </G>
        ) : null}

        {/* ── Screen ───────────────────────────────────────────────────────── */}
        <Rect
          x={geo.screenX}
          y={geo.cy - geo.halfH * 0.86}
          width={5}
          height={geo.halfH * 1.72}
          rx={2}
          fill={c.success}
          opacity={appear * 0.55}
        />
        {/* The bright spot, which rises with the beam once the plates are on. */}
        {beamOn > 0 && crossIn < 0.5 ? (
          <Circle
            cx={geo.screenX + 2}
            cy={beamY(geo.screenX, geo.cy)}
            r={6}
            fill={c.success}
            opacity={beamOn * 0.9}
          />
        ) : null}
      </Svg>

      {/* ── Labels ───────────────────────────────────────────────────────── */}
      <SceneLabel
        x={geo.cathodeX}
        y={geo.cy + geo.halfH + 6}
        text={swapIn > 0.5 ? 'කැතෝඩය (වෙනස් ලෝහයක්)' : 'කැතෝඩය (−)'}
        color={c.label}
        opacity={appear}
        size={10}
        maxWidth={130}
      />
      <SceneLabel
        x={geo.anodeX + 3}
        y={geo.cy + geo.halfH + 6}
        text="ඇනෝඩය (+)"
        color={c.label}
        opacity={appear}
        size={10}
        maxWidth={90}
      />
      <SceneLabel
        x={geo.screenX - 4}
        y={geo.cy - geo.halfH - 20}
        text="තිරය"
        color={c.label}
        opacity={appear}
        size={10}
        maxWidth={60}
      />

      <SceneLabel
        x={geo.objectX}
        y={geo.cy - geo.halfH - 20}
        text="ලෝහ කුරුසය"
        color={c.labelStrong}
        opacity={crossIn}
        size={10}
        bold
        maxWidth={110}
      />
      <SceneLabel
        x={geo.screenX - 30}
        y={geo.cy + geo.halfH * 0.9}
        text="ජායාව"
        color={c.labelStrong}
        opacity={crossIn}
        size={10}
        bold
        maxWidth={70}
      />
      <SceneLabel
        x={geo.objectX}
        y={geo.cy - geo.halfH - 20}
        text="සුළං රෝදය කැරකෙයි"
        color={c.labelStrong}
        opacity={wheelIn}
        size={10}
        bold
        maxWidth={140}
      />
      <SceneLabel
        x={geo.objectX}
        y={geo.cy - geo.halfH - 36}
        text="ධන තැටිය (+)"
        color={c.proton}
        opacity={platesIn}
        size={10}
        bold
        maxWidth={110}
      />
      <SceneLabel
        x={geo.objectX}
        y={geo.cy + geo.halfH + 22}
        text="කිරණ ධන පැත්තට නැඹුරු වේ → ඍණ ආරෝපිතයි"
        color={c.labelStrong}
        opacity={deflect}
        size={10}
        bold
        maxWidth={width * 0.6}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.88}
        text="ගෑස් හෝ කැතෝඩ ලෝහය වෙනස් කළත් e/m = 1.76 × 10⁸ C g⁻¹ — එකමයි"
        color={c.success}
        opacity={swapIn}
        size={11}
        bold
        maxWidth={width * 0.92}
      />
    </View>
  );
}
