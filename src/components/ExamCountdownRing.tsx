import { useEffect, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import { palette } from '@/constants/theme';

export interface ExamCountdownRingProps {
  /** Days left until the A/L exam. Clamped at 0; negative values read as 0. */
  daysRemaining: number;
  /** Full sweep of the ring — the length of the study plan in days. */
  totalDays: number;
  /** Outer diameter in px. @default 168 */
  size?: number;
  /** Ring thickness in px. @default 14 */
  strokeWidth?: number;
  /** Number of tick segments around the ring. @default 36 */
  segments?: number;
  /** Gap between segments, in degrees. @default 2 */
  segmentGap?: number;
  /** Days remaining at which the ring switches to its urgent palette. @default 30 */
  urgentThreshold?: number;
  /** Caption under the day count. @default 'days to A/L' */
  label?: string;
  /** Fired when the ring is tapped. Omit to render it non-interactive. */
  onPress?: () => void;
  /**
   * Fired once, on the render where `daysRemaining` first falls at or below
   * `urgentThreshold`. Will not fire again unless the count rises back above it.
   */
  onUrgent?: (daysRemaining: number) => void;
}

/**
 * Custom component: a segmented countdown ring drawn from scratch in SVG.
 *
 * Built rather than borrowed because no chart library draws this — it is not a
 * progress bar bent into a circle. Each of the 36 segments is an independently
 * stroked arc, so the ring reads as *discrete days ticking away* rather than a
 * continuously filling bar. On a study app the difference matters: a student
 * glancing at it should feel a countdown, not a completion metric.
 *
 * How it works
 *  1. `segments` arcs are laid out around a circle, each spanning
 *     `360/segments - segmentGap` degrees.
 *  2. Each arc is a `<Circle>` whose `strokeDasharray` exposes exactly one
 *     segment's worth of circumference and hides the rest — the standard trick
 *     for drawing an arc without building a path string.
 *  3. `rotation` places it, so no trigonometry is needed per segment.
 *  4. Colour is interpolated per segment from the remaining ratio, giving the
 *     ring a gradient that tightens toward red as the exam approaches.
 *
 * Deliberately not animated. It changes once a day; a spring on mount would be
 * decoration, and it would replay on every navigation back to the home screen.
 */
export function ExamCountdownRing({
  daysRemaining,
  totalDays,
  size = 168,
  strokeWidth = 14,
  segments = 36,
  segmentGap = 2,
  urgentThreshold = 30,
  label = 'days to A/L',
  onPress,
  onUrgent,
}: ExamCountdownRingProps) {
  const safeDays = Math.max(0, Math.floor(daysRemaining));
  const safeTotal = Math.max(1, Math.floor(totalDays));
  const remainingRatio = Math.min(1, safeDays / safeTotal);
  const isUrgent = safeDays <= urgentThreshold;

  // Edge-triggered so the callback fires on the transition, not on every render
  // while the app sits in an urgent state.
  const wasUrgent = useRef(isUrgent);
  useEffect(() => {
    if (isUrgent && !wasUrgent.current) {
      onUrgent?.(safeDays);
    }
    wasUrgent.current = isUrgent;
  }, [isUrgent, safeDays, onUrgent]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const degreesPerSegment = 360 / segments;
  const arcDegrees = Math.max(0.5, degreesPerSegment - segmentGap);
  const arcLength = (arcDegrees / 360) * circumference;

  /** How many segments are still "left" — always at least one while days remain. */
  const litSegments =
    safeDays === 0 ? 0 : Math.max(1, Math.round(remainingRatio * segments));

  const arcs = useMemo(
    () =>
      Array.from({ length: segments }, (_, index) => {
        const lit = index < litSegments;
        // Position within the lit range drives the colour, so the gradient
        // always spans the full visible arc regardless of how much is left.
        const position = litSegments <= 1 ? 0 : index / (litSegments - 1);
        return {
          index,
          lit,
          // -90 starts the ring at 12 o'clock instead of 3 o'clock.
          rotation: -90 + index * degreesPerSegment,
          color: lit ? segmentColor(position, isUrgent) : palette.gray[200],
        };
      }),
    [segments, litSegments, degreesPerSegment, isUrgent],
  );

  const center = size / 2;

  const ring = (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <G>
          {arcs.map((arc) => (
            <Circle
              key={arc.index}
              cx={center}
              cy={center}
              r={radius}
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              fill="none"
              // Show exactly one segment, hide the remaining circumference.
              strokeDasharray={`${arcLength} ${circumference - arcLength}`}
              // Rotate about the centre to place this segment.
              originX={center}
              originY={center}
              rotation={arc.rotation}
              opacity={arc.lit ? 1 : 0.45}
            />
          ))}

          {/* Inner hairline: grounds the numerals so they do not float. */}
          <Circle
            cx={center}
            cy={center}
            r={radius - strokeWidth}
            stroke={palette.gray[200]}
            strokeWidth={1}
            fill="none"
            opacity={0.6}
          />

          {/* 12 o'clock notch: the fixed exam date the ring counts down to. */}
          <Line
            x1={center}
            y1={center - radius - strokeWidth / 2}
            x2={center}
            y2={center - radius + strokeWidth / 2}
            stroke={isUrgent ? palette.danger : palette.primary[700]}
            strokeWidth={2.5}
          />
        </G>
      </Svg>

      {/* Numerals are React Native Text, not SVG Text — they inherit the app's
          font scaling and dark-mode colours for free, which SVG text does not. */}
      <View className="absolute items-center justify-center">
        <Text
          className="font-bold text-gray-900 dark:text-white"
          style={{ fontSize: size * 0.26, lineHeight: size * 0.3 }}
        >
          {safeDays}
        </Text>
        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</Text>
        {isUrgent && safeDays > 0 ? (
          <Text className="mt-1 text-[10px] font-semibold" style={{ color: palette.danger }}>
            FINAL STRETCH
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return ring;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${safeDays} ${label}`}
      accessibilityHint="Opens your study planner"
      className="active:opacity-80"
    >
      {ring}
    </Pressable>
  );
}

/**
 * Interpolates a segment's colour.
 *
 * Two separate ramps rather than one long gradient: in the calm state the ring
 * stays inside the brand indigo/violet range, and once urgent it shifts wholesale
 * to amber→red. A single ramp through all four colours would spend most of the
 * year looking vaguely alarming.
 */
function segmentColor(position: number, urgent: boolean): string {
  const ramp = urgent
    ? [palette.danger, '#F97316', palette.warning]
    : [palette.primary[600], palette.accent[500], palette.primary[400]];

  const scaled = position * (ramp.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(ramp.length - 1, lower + 1);
  return mixHex(ramp[lower], ramp[upper], scaled - lower);
}

/** Linear RGB blend of two #rrggbb strings. */
function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${channel(a.r, b.r)}, ${channel(a.g, b.g)}, ${channel(a.b, b.b)})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
