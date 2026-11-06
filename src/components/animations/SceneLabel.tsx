import { Text, View } from 'react-native';

export interface SceneLabelProps {
  x: number;
  y: number;
  text: string;
  color: string;
  // 0 = hidden, for fading in
  opacity?: number;
  size?: number;
  bold?: boolean;
  // default 'center'
  anchor?: 'start' | 'center' | 'end';
  maxWidth?: number;
  // see-through box behind the text for busy backgrounds
  plate?: boolean;
  plateColor?: string;
}

// text label on top of the svg.
// uses RN Text not svg Text because sinhala letters don't always render right
// in react-native-svg on android. also gets font scaling and dark mode for free.
// downside: no viewBox scaling, so scenes place labels in pixels
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

  // left/right instead of transform, RN can't measure text during layout
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
