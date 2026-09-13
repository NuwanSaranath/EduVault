import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/theme';

interface ProgressBarProps {
  percent: number;
  height?: number;
  colors?: [string, string];
}

export function ProgressBar({ percent, height = 8, colors = gradients.primary }: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(100, Math.max(0, percent)), { duration: 700 });
  }, [percent, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View
      style={{ height, borderRadius: height / 2 }}
      className="w-full overflow-hidden bg-gray-200 dark:bg-gray-700"
    >
      <Animated.View style={[{ height }, animatedStyle]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: height / 2 }}
        />
      </Animated.View>
    </View>
  );
}
