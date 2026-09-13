import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { SyncStatusBanner } from '@/components';
import { palette } from '@/constants/theme';
import { tabIcons } from '@/navigation/tabIcons';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1">
      {/* Above the tab navigator rather than inside each screen: connectivity is
          app-wide state, and one mount point means one subscription instead of
          five. Collapses to zero height when online with an empty outbox. */}
      <SyncStatusBanner />
      <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary[600],
        tabBarInactiveTintColor: isDark ? palette.gray[500] : palette.gray[400],
        tabBarStyle: {
          backgroundColor: isDark ? palette.gray[900] : '#FFFFFF',
          borderTopColor: isDark ? palette.gray[800] : palette.gray[100],
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = tabIcons[route.name] ?? tabIcons.index;
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
      })}
    >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="subjects" options={{ title: 'Subjects' }} />
        <Tabs.Screen name="practice" options={{ title: 'Practice' }} />
        <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </View>
  );
}
