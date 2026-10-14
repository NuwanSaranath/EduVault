import { Text, View } from 'react-native';

export interface SceneLabelProps {
  x: number;
  y: number;
  text: string;
  color: string;
  /** 0 hides the label entirely; used to fade labels in with the animation. */
  opacity?: number;
  size?: number;
  bold?: boolean;
  /** Horizontal anchor relative to (x, y). @default 'center' */
  anchor?: 'start' | 'center' | 'end';
  /** Maximum width before wrapping. */
  maxWidth?: number;
  /** Draws a translucent plate behind the text, for labels over busy artwork. */
  plate?: boolean;
  plateColor?: string;
}

/**
 * A text label positioned over a scene's SVG canvas.
 *
 * Labels are React Native `<Text>` rather than SVG `<Text>`, deliberately.
 * Lesson content here is Sinhala, and complex-script shaping (consonant
 * conjuncts, vowel signs that attach on both sides of a glyph) is handled by the
 * platform text engine but historically unreliable inside react-native-svg on
 * Android. Rendering through RN's own text stack also inherits the user's font
 * scaling and dark-mode colours for free — neither of which SVG text does.
 *
 * The cost is that labels cannot be transformed with the SVG viewBox, so scenes
 * position them in the same pixel space they use for the drawing.
 */
export function SceneLabel({
  x,
  y,
  text,
  color,
  opacity = 1,
  size = 11,
  bold = false,
  anchor = 'center',
  maxWidth,
  plate = false,
  plateColor = 'rgba(0,0,0,0.45)',
}: SceneLabelProps) {
  if (opacity <= 0.01) return null;

  // `left`/`right` rather than a transform: RN has no intrinsic text measurement
  // during layout, so anchoring is expressed as which edge is pinned.
  const horizontal =
    anchor === 'start'
      ? { left: x }
      : anchor === 'end'
        ? { right: undefined, left: x, transform: [{ translateX: -1000 }] }
        : { left: x - (maxWidth ?? 160) / 2, width: maxWidth ?? 160 };

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: y,
        opacity,
        ...(anchor === 'center'
          ? horizontal
          : anchor === 'start'
            ? { left: x, maxWidth }
            : { left: 0, width: x, alignItems: 'flex-end' }),
      }}
    >
      <Text
        allowFontScaling={false}
        numberOfLines={3}
        style={{
          color,
          fontSize: size,
          fontWeight: bold ? '700' : '500',
          textAlign: anchor === 'center' ? 'center' : anchor === 'end' ? 'right' : 'left',
          lineHeight: size * 1.45,
          ...(plate
            ? {
                backgroundColor: plateColor,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                overflow: 'hidden',
              }
            : null),
        }}
      >
        {text}
      </Text>
    </View>
  );
}
