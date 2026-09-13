import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  onPress?: PressableProps['onPress'];
}

export function Card({ children, className, onPress, ...rest }: CardProps) {
  const base = `bg-card-light dark:bg-card-dark rounded-2xl p-4 shadow-sm shadow-black/5 ${className ?? ''}`;

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${base} active:opacity-80`}>
        {children}
      </Pressable>
    );
  }

  return (
    <View className={base} {...rest}>
      {children}
    </View>
  );
}
