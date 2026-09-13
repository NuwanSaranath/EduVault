import { Image, Text, View } from 'react-native';
import { initials } from '@/utils/format';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
}

export function Avatar({ name, uri, size = 48 }: AvatarProps) {
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={style} />;
  }

  return (
    <View
      style={style}
      className="items-center justify-center bg-primary-100 dark:bg-primary-900"
    >
      <Text
        style={{ fontSize: size * 0.36 }}
        className="font-bold text-primary-700 dark:text-primary-200"
      >
        {initials(name)}
      </Text>
    </View>
  );
}
