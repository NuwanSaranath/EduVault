import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Badge, Card, GradientHeader, ScreenContainer, SectionHeader } from '@/components';
import { achievements } from '@/constants/data/achievements';
import { palette } from '@/constants/theme';
import { levelForXp, levelTitle, xpIntoCurrentLevel } from '@/features/gamification/xp';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';

const settingsLinks = [
  { key: 'settings', label: 'App Settings', icon: 'settings-outline' as const, route: '/profile/settings' as const },
  { key: 'ai-tutor', label: 'AI Tutor', icon: 'sparkles-outline' as const, route: '/ai-tutor' as const },
  { key: 'planner', label: 'Study Planner', icon: 'calendar-outline' as const, route: '/planner' as const },
];

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { xp, streakDays, unlockedBadgeIds } = useProgressStore();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const level = levelForXp(xp);
  const { current, required } = xpIntoCurrentLevel(xp);

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <GradientHeader>
        <View className="items-center">
          <Avatar name={user.name} size={72} />
          <Text className="mt-3 text-xl font-bold text-white">{user.name}</Text>
          <Text className="text-sm text-white/80">{user.school}</Text>
          <View className="mt-2 flex-row gap-2">
            <Badge label={user.stream} tone="neutral" />
            <Badge label={`A/L ${user.alYear}`} tone="neutral" />
          </View>
        </View>
      </GradientHeader>

      <View className="px-5 pt-5">
        <Card className="mb-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Level {level} · {levelTitle(level)}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">{current}/{required} XP</Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <View
              className="h-2 rounded-full bg-primary-600"
              style={{ width: `${Math.min(100, (current / required) * 100)}%` }}
            />
          </View>
          <View className="mt-3 flex-row items-center">
            <Text className="text-base">🔥</Text>
            <Text className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              {streakDays} day streak
            </Text>
          </View>
        </Card>

        <SectionHeader title="Achievements" />
        <View className="mb-5 flex-row flex-wrap gap-3">
          {achievements.map((achievement) => {
            const unlocked = !!achievement.unlockedAt || unlockedBadgeIds.includes(achievement.id);
            return (
              <Card key={achievement.id} className={`items-center ${unlocked ? '' : 'opacity-40'}`} style={{ width: '30%' }}>
                <Ionicons name={achievement.icon as never} size={26} color={unlocked ? palette.warning : palette.gray[400]} />
                <Text className="mt-2 text-center text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {achievement.title}
                </Text>
              </Card>
            );
          })}
        </View>

        <SectionHeader title="More" />
        {settingsLinks.map((link) => (
          <Card key={link.key} onPress={() => router.push(link.route)} className="mb-3">
            <View className="flex-row items-center">
              <Ionicons name={link.icon} size={20} color={palette.primary[600]} />
              <Text className="ml-3 flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{link.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={palette.gray[400]} />
            </View>
          </Card>
        ))}

        <Card onPress={handleLogout} className="mb-8 mt-2">
          <View className="flex-row items-center justify-center">
            <Ionicons name="log-out-outline" size={18} color={palette.danger} />
            <Text className="ml-2 text-sm font-semibold text-danger">Log Out</Text>
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}
