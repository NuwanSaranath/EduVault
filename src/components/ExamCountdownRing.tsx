import { useEffect, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import { palette } from '@/constants/theme';

export interface ExamCountdownRingProps {
  // days left until the exam, below 0 shows as 0
  daysRemaining: number;
  // length of the study plan in days (full ring)
  totalDays: number;
  // size in px, default 168
  size?: number;
  // ring thickness, default 14
  strokeWidth?: number;
  // number of segments, default 36
  segments?: number;
  // gap between segments in degrees, default 2
  segmentGap?: number;
  // days left when it turns red/amber, default 30
  urgentThreshold?: number;
  // text under the number, default 'days to A/L'
  label?: string;
  // leave out if it shouldn't be tappable
  onPress?: () => void;
  // called once when daysRemaining first goes to urgentThreshold or below.
  // won't fire again unless it goes back above
  onUrgent?: (daysRemaining: number) => void;
}

// Countdown ring drawn with svg.
// Made from 36 separate segments so it looks like days ticking away, not a
// progress bar filling up.
//  1. each segment is 360/segments - segmentGap degrees
//  2. each one is a <Circle> with strokeDasharray showing only that segment's
//     part of the circle (easy way to draw an arc without a path)
//  3. rotation puts it in place, no trig needed
//  4. colour changes per segment, goes towards red as the exam gets close
// Not animated, it only changes once a day.
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

  // only fire when it changes to urgent, not every render
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

  // segments still left, at least 1 if there are days left
  const litSegments =
    safeDays === 0 ? 0 : Math.max(1, Math.round(remainingRatio * segments));

  const arcs = useMemo(
    () =>
      Array.from({ length: segments }, (_, index) => {
        const lit = index < litSegments;
        // colour from position in the lit part so the gradient always covers it all
        const position = litSegments <= 1 ? 0 : index / (litSegments - 1);
        return {
          index,
          lit,
          // -90 so it starts at the top
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
              // show one segment, hide the rest of the circle
              strokeDasharray={`${arcLength} ${circumference - arcLength}`}
              // rotate around the centre
              originX={center}
              originY={center}
              rotation={arc.rotation}
              opacity={arc.lit ? 1 : 0.45}
            />
          ))}

          {/* thin inner circle behind the numbers */}
          <Circle
            cx={center}
            cy={center}
            r={radius - strokeWidth}
            stroke={palette.gray[200]}
            strokeWidth={1}
            fill="none"
            opacity={0.6}
          />

          {/* notch at the top = exam day */}
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

      {/* normal Text not svg text, so font scaling and dark mode just work */}
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

// segment colour. purple range normally, amber to red when urgent. one
// gradient through all 4 colours would look scary most of the year
function segmentColor(position: number, urgent: boolean): string {
  const ramp = urgent
    ? [palette.danger, '#F97316', palette.warning]
    : [palette.primary[600], palette.accent[500], palette.primary[400]];

  const scaled = position * (ramp.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(ramp.length - 1, lower + 1);
  return mixHex(ramp[lower], ramp[upper], scaled - lower);
}

// mix two #rrggbb colours
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
