import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { gradients } from '@/constants/theme';

export function SplashScreen() {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    scale.value = withSequence(
      withTiming(1.08, { duration: 500, easing: Easing.out(Easing.exp) }),
      withTiming(1, { duration: 200 }),
    );
  }, [opacity, scale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center">
        <Animated.View style={logoStyle} className="items-center">
          <View className="mb-4 h-24 w-24 items-center justify-center rounded-3xl bg-white/15">
            <Ionicons name="school" size={52} color="#fff" />
          </View>
          <Text className="text-3xl font-extrabold text-white">EduVault</Text>
          <Text className="mt-1 text-sm text-white/80">Your A/L Success Partner</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}
