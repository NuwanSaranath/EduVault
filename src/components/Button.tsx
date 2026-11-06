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
  // use right for arrows like "Next →"
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

// padding is here twice: tailwind classes for the normal buttons and numbers
// for the gradient one. nativewind ignores className on LinearGradient (not a
// core component) so the icon and text ended up stacked instead of in a row
const sizeStyles: Record<Size, { padY: string; text: string; padV: number; padH: number }> = {
  sm: { padY: 'py-2 px-4', text: 'text-sm', padV: 8, padH: 16 },
  md: { padY: 'py-3.5 px-5', text: 'text-base', padV: 14, padH: 20 },
  lg: { padY: 'py-4 px-6', text: 'text-lg', padV: 16, padH: 24 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { padY, text, padV, padH } = sizeStyles[size];
  const widthClass = fullWidth ? 'w-full' : 'self-start';
  const spacing = icon ? (iconPosition === 'right' ? 'mr-2' : 'ml-2') : '';

  // label + icon, icon on left or right
  const content = (textColorClass: string) =>
    iconPosition === 'right' ? (
      <>
        <Text className={`${text} font-semibold ${textColorClass} ${spacing}`}>{label}</Text>
        {icon}
      </>
    ) : (
      <>
        {icon}
        <Text className={`${text} font-semibold ${textColorClass} ${spacing}`}>{label}</Text>
      </>
    );

  if (variant === 'primary') {
    return (
      <Pressable
        disabled={isDisabled}
        className={`${widthClass} ${isDisabled ? 'opacity-60' : ''}`}
        {...rest}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: padV,
            paddingHorizontal: padH,
          }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : content('text-white')}
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
      {loading ? <ActivityIndicator /> : content(textColorClass)}
    </Pressable>
  );
}
