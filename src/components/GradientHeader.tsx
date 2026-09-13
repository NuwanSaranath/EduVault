import { View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gradients } from '@/constants/theme';

interface GradientHeaderProps extends ViewProps {
  colors?: [string, string];
}

export function GradientHeader({ children, colors = gradients.primary, className, ...rest }: GradientHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
    >
      <View className={`px-5 pb-6 ${className ?? ''}`} {...rest}>
        {children}
      </View>
    </LinearGradient>
  );
}
