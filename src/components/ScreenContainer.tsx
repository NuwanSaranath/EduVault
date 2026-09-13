import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenContainerProps extends ViewProps {
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenContainer({
  children,
  className,
  scroll = false,
  edges = ['top', 'bottom'],
  ...rest
}: ScreenContainerProps) {
  return (
    <SafeAreaView
      edges={edges}
      className="flex-1 bg-surface-light dark:bg-surface-dark"
    >
      {scroll ? (
        <ScrollView
          className={className}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${className ?? ''}`} {...rest}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
