import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeStyles: Record<Size, { padY: string; text: string }> = {
  sm: { padY: 'py-2 px-4', text: 'text-sm' },
  md: { padY: 'py-3.5 px-5', text: 'text-base' },
  lg: { padY: 'py-4 px-6', text: 'text-lg' },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = true,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { padY, text } = sizeStyles[size];
  const widthClass = fullWidth ? 'w-full' : 'self-start';

  if (variant === 'primary') {
    return (
      <Pressable disabled={isDisabled} className={`${widthClass} ${isDisabled ? 'opacity-60' : ''}`} {...rest}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 16 }}
          className={`flex-row items-center justify-center ${padY}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {icon}
              <Text className={`${text} font-semibold text-white ${icon ? 'ml-2' : ''}`}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantClass =
    variant === 'secondary'
      ? 'bg-primary-50 dark:bg-primary-900/40'
      : variant === 'outline'
        ? 'bg-transparent border-2 border-primary-500'
        : 'bg-transparent';

  const textColorClass =
    variant === 'secondary'
      ? 'text-primary-700 dark:text-primary-200'
      : variant === 'outline'
        ? 'text-primary-600 dark:text-primary-300'
        : 'text-gray-600 dark:text-gray-300';

  return (
    <Pressable
      disabled={isDisabled}
      className={`${widthClass} ${padY} rounded-2xl flex-row items-center justify-center ${variantClass} ${isDisabled ? 'opacity-60' : ''} ${className ?? ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          {icon}
          <Text className={`${text} font-semibold ${textColorClass} ${icon ? 'ml-2' : ''}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
