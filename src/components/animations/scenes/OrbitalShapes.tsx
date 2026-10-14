import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { easeInOut, easeOut, lerp, segment } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * §1.3.2 — කාක්ෂිකවල හැඩ (Shapes of orbitals).
 *
 * From the lesson's image note: *"p කාක්ෂික 3ක් — එකම හැඩය, වෙනස් දිශාව" is
 * confusing in words alone.* The fix is not to draw three dumbbells; three
 * dumbbells side by side look like three different things.
 *
 * The fix is to **rotate one into another**. p_y is introduced by taking a copy
 * of p_x and swinging it about the origin onto the y axis, leaving p_x in place.
 * The student watches one object become the other, so "same shape, different
 * orientation" is something they saw rather than something they were told. p_z
 * then arrives the same way.
 *
 * Axes use a fixed pseudo-3D projection — z up, x toward the viewer's right, y
 * away to the left — so all four orbitals share one spatial frame.
 */

/** Screen-space direction of each axis, in degrees (SVG: y grows down). */
const AXIS_ANGLE = {
  x: Math.atan2(0.35, 0.9) * (180 / Math.PI), // ≈ 21°, right and slightly down
  y: Math.atan2(0.35, -0.9) * (180 / Math.PI), // ≈ 159°, left and slightly down
  z: -90, // straight up
};

export function OrbitalShapes({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const cx = width * 0.5;
    const cy = height * 0.46;
    const axisLen = Math.min(width * 0.3, height * 0.34);
    return { cx, cy, axisLen, lobe: axisLen * 0.52 };
  }, [width, height]);

  const time = reduceMotion ? 20 : t;

  const axesIn = easeOut(segment(time, 0, 1.6));
  const sIn = easeOut(segment(time, 3, 5));
  const sOut = segment(time, 7.6, 8.6); // s fades back so the p lobes stay legible
  const pxIn = easeOut(segment(time, 8.4, 10));
  const morph = easeInOut(segment(time, 12.4, 15.2)); // p_x copy swings to p_y
  const pzMorph = easeInOut(segment(time, 16.4, 18.4));
  const conclusionIn = easeOut(segment(time, 19.4, 21));

  /** One p orbital: two lobes on opposite sides of the origin, along `angle`. */
  const renderP = (angleDeg: number, colour: string, opacity: number, key: string) => {
    if (opacity <= 0.01) return null;
    return (
      <G key={key} origin={`${geo.cx}, ${geo.cy}`} rotation={angleDeg} opacity={opacity}>
        <Ellipse
          cx={geo.cx + geo.lobe * 0.55}
          cy={geo.cy}
          rx={geo.lobe * 0.55}
          ry={geo.lobe * 0.33}
          fill={colour}
          opacity={0.55}
        />
        <Ellipse
          cx={geo.cx - geo.lobe * 0.55}
          cy={geo.cy}
          rx={geo.lobe * 0.55}
          ry={geo.lobe * 0.33}
          fill={colour}
          opacity={0.55}
        />
        {/* The node at the origin — where the electron is never found. */}
        <Circle cx={geo.cx} cy={geo.cy} r={2.5} fill={c.bg} />
      </G>
    );
  };

  /** Axis line with a label position returned for the caller to place text. */
  const renderAxis = (angleDeg: number, label: string) => {
    const rad = (angleDeg * Math.PI) / 180;
    const x = geo.cx + Math.cos(rad) * geo.axisLen;
    const y = geo.cy + Math.sin(rad) * geo.axisLen;
    return (
      <G key={label} opacity={axesIn}>
        <Line
          x1={geo.cx - Math.cos(rad) * geo.axisLen * 0.35}
          y1={geo.cy - Math.sin(rad) * geo.axisLen * 0.35}
          x2={x}
          y2={y}
          stroke={c.axis}
          strokeWidth={1.4}
        />
      </G>
    );
  };

  const axisEnd = (angleDeg: number, scale = 1.12) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: geo.cx + Math.cos(rad) * geo.axisLen * scale,
      y: geo.cy + Math.sin(rad) * geo.axisLen * scale,
    };
  };

  const xEnd = axisEnd(AXIS_ANGLE.x);
  const yEnd = axisEnd(AXIS_ANGLE.y);
  const zEnd = axisEnd(AXIS_ANGLE.z);

  // The travelling copy: p_x's angle swings to p_y, then a second copy to p_z.
  const morphAngle = lerp(AXIS_ANGLE.x, AXIS_ANGLE.y, morph);
  const pzAngle = lerp(AXIS_ANGLE.y, AXIS_ANGLE.z + 360, pzMorph) % 360;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {renderAxis(AXIS_ANGLE.x, 'x')}
        {renderAxis(AXIS_ANGLE.y, 'y')}
        {renderAxis(AXIS_ANGLE.z, 'z')}

        {/* ── s orbital: a sphere, no directional preference ───────────────── */}
        {sIn > 0 ? (
          <G opacity={sIn * (1 - sOut * 0.72)}>
            <Circle
              cx={geo.cx}
              cy={geo.cy}
              r={geo.lobe * 0.72}
              fill={c.success}
              opacity={0.4}
            />
            <Circle
              cx={geo.cx}
              cy={geo.cy}
              r={geo.lobe * 0.72}
              stroke={c.success}
              strokeWidth={1.4}
              fill="none"
            />
          </G>
        ) : null}

        {/* ── p_x, placed and then left alone ─────────────────────────────── */}
        {renderP(AXIS_ANGLE.x, c.electron, pxIn, 'px')}

        {/* ── The copy in flight: p_x rotating onto y, then onto z ─────────── */}
        {morph > 0 && pzMorph <= 0
          ? renderP(morphAngle, c.highlight, 1, 'morph-y')
          : null}
        {morph >= 1 && pzMorph <= 0 ? null : null}

        {/* p_y, settled */}
        {morph >= 0.999 || pzMorph > 0
          ? renderP(AXIS_ANGLE.y, c.highlight, 1, 'py')
          : null}

        {/* p_z in flight, then settled */}
        {pzMorph > 0 ? renderP(pzAngle, c.nucleus, 1, 'pz') : null}
      </Svg>

      <SceneLabel
        x={xEnd.x}
        y={xEnd.y - 6}
        text="x"
        color={c.label}
        opacity={axesIn}
        size={11}
        bold
        maxWidth={24}
      />
      <SceneLabel
        x={yEnd.x}
        y={yEnd.y - 6}
        text="y"
        color={c.label}
        opacity={axesIn}
        size={11}
        bold
        maxWidth={24}
      />
      <SceneLabel
        x={zEnd.x}
        y={zEnd.y - 10}
        text="z"
        color={c.label}
        opacity={axesIn}
        size={11}
        bold
        maxWidth={24}
      />

      <SceneLabel
        x={width * 0.5}
        y={height * 0.04}
        text="s කාක්ෂිකය — ගෝලාකාරයි, දිශාවක් නැත"
        color={c.success}
        opacity={sIn * (1 - sOut)}
        size={12}
        bold
        maxWidth={width * 0.9}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.04}
        text="pₓ කාක්ෂිකය — x අක්ෂය දිගේ ඩම්බෙල් හැඩය"
        color={c.electron}
        opacity={pxIn * (1 - morph)}
        size={12}
        bold
        maxWidth={width * 0.9}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.04}
        text="එම හැඩය ම කරකවමු → p_y"
        color={c.highlight}
        opacity={morph * (1 - pzMorph)}
        size={12}
        bold
        maxWidth={width * 0.9}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.04}
        text="නැවතත් කරකවමු → p_z"
        color={c.nucleus}
        opacity={pzMorph * (1 - conclusionIn)}
        size={12}
        bold
        maxWidth={width * 0.9}
      />

      <SceneLabel
        x={width * 0.5}
        y={height * 0.86}
        text={
          'p කාක්ෂික තුන — එකම හැඩය, එකම ශක්තිය, වෙනස් දිශාව පමණි\n' +
          's: l = 0 (1 කාක්ෂිකයක්)  ·  p: l = 1 (කාක්ෂික 3ක්)'
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
