import { useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components';
import { gradients } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

const { width } = Dimensions.get('window');

const pages = [
  {
    icon: 'library-outline' as const,
    title: 'Everything You Need for A/L Success',
    description: 'Access theory notes, past papers, and quizzes in one place.',
  },
  {
    icon: 'bulb-outline' as const,
    title: 'Practice Smarter',
    description: 'Improve your knowledge with thousands of MCQ questions.',
  },
  {
    icon: 'stats-chart-outline' as const,
    title: 'Track Your Progress',
    description: 'Monitor your performance and improve weak areas.',
  },
];

export function OnboardingScreen() {
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const finish = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  const goToPage = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setPageIndex(index);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setPageIndex(index);
  };

  const isLast = pageIndex === pages.length - 1;

  return (
    <View className="flex-1 bg-surface-light dark:bg-surface-dark">
      <View className="flex-row justify-end px-5 pt-14">
        {!isLast ? (
          <Text onPress={finish} className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            Skip
          </Text>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {pages.map((page) => (
          <View key={page.title} style={{ width }} className="flex-1 items-center justify-center px-8">
            <LinearGradient
              colors={gradients.primarySoft}
              style={{ width: 140, height: 140, borderRadius: 70 }}
              className="mb-8 items-center justify-center"
            >
              <Ionicons name={page.icon} size={64} color="#fff" />
            </LinearGradient>
            <Text className="mb-3 text-center text-2xl font-bold text-gray-900 dark:text-white">
              {page.title}
            </Text>
            <Text className="text-center text-base text-gray-500 dark:text-gray-400">
              {page.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row items-center justify-center py-6">
        {pages.map((page, index) => (
          <View
            key={page.title}
            className={`mx-1 h-2 rounded-full ${
              index === pageIndex ? 'w-6 bg-primary-600' : 'w-2 bg-gray-300 dark:bg-gray-700'
            }`}
          />
        ))}
      </View>

      <View className="px-6 pb-10">
        <Button
          label={isLast ? 'Get Started' : 'Next'}
          onPress={() => (isLast ? finish() : goToPage(pageIndex + 1))}
        />
      </View>
    </View>
  );
}
