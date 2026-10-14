import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { sceneColors } from '@/features/animation/colors';
import type { SceneProps } from '@/features/animation/types';
import { easeOut, seeded, segment, stagger } from '@/features/animation/timing';
import { SceneLabel } from '../SceneLabel';

/**
 * 1.1.5 — සමස්ථානික (Isotopes): same Z, different A.
 *
 * Built to kill one specific, very common exam mistake, which the lesson names
 * outright: *"සමස්ථානිකවල ඉලෙක්ට්‍රෝන ගණන වෙනස්"*. The animation makes that
 * impossible to believe by building all three carbon isotopes from the same
 * starting point — six protons and six electrons are placed once and then
 * **never touched again**. Only grey neutrons are added, one at a time, and the
 * student can count them.
 *
 * Because protons and electrons are visibly identical across the three atoms,
 * the conclusion that chemical properties are identical (and only mass differs)
 * is something the picture states rather than something the caption asserts.
 */

const ISOTOPES = [
  { mass: 12, neutrons: 6, abundance: '98.9%' },
  { mass: 13, neutrons: 7, abundance: '1.1%' },
  { mass: 14, neutrons: 8, abundance: 'ලුහුඬු (radioactive)' },
];

const PROTONS = 6;

export function IsotopeBuilder({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);

  const geo = useMemo(() => {
    const columnW = width / 3;
    const cy = height * 0.42;
    const nucleusR = Math.min(columnW * 0.2, height * 0.14);
    return { columnW, cy, nucleusR, shellR: nucleusR * 2.1 };
  }, [width, height]);

  const time = reduceMotion ? 17 : t;
  const conclusionIn = easeOut(segment(time, 15.6, 16.8));

  /** Packs nucleons in a spiral so the cluster stays tight at any count. */
  const nucleonPosition = (index: number, total: number, cx: number, cy: number) => {
    const golden = 2.39996;
    const r = geo.nucleusR * 0.62 * Math.sqrt((index + 0.5) / total);
    const a = index * golden + seeded(index) * 0.4;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {ISOTOPES.map((iso, col) => {
          const cx = geo.columnW * (col + 0.5);
          // Columns build one after another so the difference accumulates.
          const columnIn = easeOut(segment(time, 0.6 + col * 4.4, 1.8 + col * 4.4));
          if (columnIn <= 0) return null;

          const total = PROTONS + iso.neutrons;

          return (
            <G key={iso.mass} opacity={columnIn}>
              {/* Electron shell: 2, 4 — identical in all three, and drawn first
                  so it is clearly not part of what changes. */}
              <Circle
                cx={cx}
                cy={geo.cy}
                r={geo.shellR}
                stroke={c.electron}
                strokeWidth={1}
                strokeDasharray="3 4"
                fill="none"
                opacity={0.55}
              />
              {Array.from({ length: PROTONS }, (_, i) => {
                const a = (i / PROTONS) * Math.PI * 2 - Math.PI / 2;
                return (
                  <Circle
                    key={`e${i}`}
                    cx={cx + Math.cos(a) * geo.shellR}
                    cy={geo.cy + Math.sin(a) * geo.shellR}
                    r={3.2}
                    fill={c.electron}
                  />
                );
              })}

              {/* Protons — placed once, never varied. */}
              {Array.from({ length: PROTONS }, (_, i) => {
                const p = nucleonPosition(i, total, cx, geo.cy);
                return <Circle key={`p${i}`} cx={p.x} cy={p.y} r={5.2} fill={c.proton} />;
              })}

              {/* Neutrons — the only thing that differs. Added one at a time so
                  they can be counted as they land. */}
              {Array.from({ length: iso.neutrons }, (_, i) => {
                const enter = stagger(
                  i,
                  iso.neutrons,
                  time,
                  1.6 + col * 4.4,
                  0.34,
                  0.25,
                );
                if (enter <= 0) return null;
                const p = nucleonPosition(PROTONS + i, total, cx, geo.cy);
                return (
                  <Circle
                    key={`n${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={5.2 * enter}
                    fill={c.neutron}
                    opacity={enter}
                  />
                );
              })}
            </G>
          );
        })}
      </Svg>

      {ISOTOPES.map((iso, col) => {
        const cx = geo.columnW * (col + 0.5);
        const columnIn = easeOut(segment(time, 0.6 + col * 4.4, 1.8 + col * 4.4));
        const countsIn = easeOut(segment(time, 2.4 + col * 4.4, 3.4 + col * 4.4));
        return (
          <View key={iso.mass}>
            <SceneLabel
              x={cx}
              y={height * 0.04}
              text={`${iso.mass === 12 ? '¹²' : iso.mass === 13 ? '¹³' : '¹⁴'}C`}
              color={c.labelStrong}
              opacity={columnIn}
              size={16}
              bold
              maxWidth={geo.columnW}
            />
            <SceneLabel
              x={cx}
              y={geo.cy + geo.shellR + 16}
              text={`ප්‍රෝටෝන 6\nඉලෙක්ට්‍රෝන 6`}
              color={c.label}
              opacity={countsIn}
              size={10}
              maxWidth={geo.columnW * 0.92}
            />
            <SceneLabel
              x={cx}
              y={geo.cy + geo.shellR + 48}
              text={`නියුට්‍රෝන ${iso.neutrons}`}
              color={c.neutron}
              opacity={countsIn}
              size={11}
              bold
              maxWidth={geo.columnW * 0.92}
            />
            <SceneLabel
              x={cx}
              y={geo.cy + geo.shellR + 68}
              text={`සුලභතාව ${iso.abundance}`}
              color={c.muted}
              opacity={countsIn * (1 - conclusionIn)}
              size={9}
              maxWidth={geo.columnW * 0.92}
            />
          </View>
        );
      })}

      <SceneLabel
        x={width * 0.5}
        y={height * 0.87}
        text="Z = 6 තුනේම එකයි → රසායනික ගුණ එකමයි.  A වෙනස් → ස්කන්ධය පමණක් වෙනස්."
        color={c.labelStrong}
        opacity={conclusionIn}
        size={11}
        bold
        maxWidth={width * 0.94}
      />
      <SceneLabel
        x={width * 0.5}
        y={height * 0.94}
        text="ඉලෙක්ට්‍රෝන ගණන කිසිසේත් වෙනස් නොවේ — මෙය බහුලව සිදුවන වැරැද්දකි"
        color={c.danger}
        opacity={conclusionIn}
        size={10}
        bold
        maxWidth={width * 0.94}
      />
    </View>
  );
}
