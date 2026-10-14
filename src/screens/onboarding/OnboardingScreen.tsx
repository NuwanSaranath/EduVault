import { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Button } from '@/components';
import { gradients, palette } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

const { width, height } = Dimensions.get('window');

/** Hero height as a share of the screen, so short devices do not lose the copy. */
const HERO_RATIO = 0.46;

interface Page {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  /** Concrete capabilities. Three pages of a bare tagline reads as filler. */
  highlights: string[];
}

const pages: Page[] = [
  {
    icon: 'library',
    title: 'Everything for A/L,\nin one place',
    description:
      'Syllabus theory, past papers and practice — organised by subject and chapter.',
    highlights: ['Guided lessons in Sinhala', 'Real past papers with marking'],
  },
  {
    icon: 'bulb',
    title: 'Practice that\nadapts to you',
    description:
      'Questions are chosen from your weakest and least-recent topics, not at random.',
    highlights: ['Swipe-graded flashcards', 'Exam-style OMR answer sheet'],
  },
  {
    icon: 'cloud-offline',
    title: 'Works without\na connection',
    description:
      'Study on the bus or in class. Everything saves locally and syncs when you are back online.',
    highlights: ['Full offline access', 'Nothing is ever lost'],
  },
];

export function OnboardingScreen() {
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
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
    if (index !== pageIndex) setPageIndex(index);
  };

  const isLast = pageIndex === pages.length - 1;
  const heroHeight = Math.max(260, height * HERO_RATIO);

  return (
    <View className="flex-1 bg-surface-light dark:bg-surface-dark">
      {/* ── Hero ──────────────────────────────────────────────────────────
          A full-bleed gradient rather than a small circle on a flat page:
          it gives the screen a focal point and lets the content sheet below
          overlap it for depth. */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          height: heroHeight,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
        }}
      >
        {/* Decorative circles — depth without imagery, and they cost nothing
            to render compared with a bundled illustration. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -heroHeight * 0.22,
            right: -heroHeight * 0.18,
            width: heroHeight * 0.75,
            height: heroHeight * 0.75,
            borderRadius: heroHeight,
            backgroundColor: 'rgba(255,255,255,0.10)',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: heroHeight * 0.08,
            left: -heroHeight * 0.2,
            width: heroHeight * 0.5,
            height: heroHeight * 0.5,
            borderRadius: heroHeight,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        />

        {/* Top bar. Skip keeps its slot on the last page (opacity, not
            unmounting) so the header never jumps between pages. */}
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Pressable
            onPress={() => goToPage(Math.max(0, pageIndex - 1))}
            hitSlop={12}
            style={{ opacity: pageIndex === 0 ? 0 : 1 }}
            disabled={pageIndex === 0}
            accessibilityRole="button"
            accessibilityLabel="Previous"
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <Pressable
            onPress={finish}
            hitSlop={12}
            style={{ opacity: isLast ? 0 : 1 }}
            disabled={isLast}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            className="rounded-full bg-white/15 px-4 py-1.5"
          >
            <Text className="text-sm font-semibold text-white">Skip</Text>
          </Pressable>
        </View>

        {/* Brand mark, so the first thing a student sees is the product name. */}
        <View className="flex-1 items-center justify-center">
          <Animated.View
            key={`icon-${pageIndex}`}
            entering={FadeInDown.duration(380)}
            className="items-center"
          >
            <View className="mb-4 h-28 w-28 items-center justify-center rounded-full bg-white/20">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-white/25">
                <Ionicons name={pages[pageIndex].icon} size={40} color="#fff" />
              </View>
            </View>
            <Text className="text-xs font-bold uppercase tracking-[3px] text-white/80">
              EduVault
            </Text>
          </Animated.View>
        </View>
      </LinearGradient>

      {/* ── Paged copy ────────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ alignItems: 'flex-start' }}
      >
        {pages.map((page, index) => (
          <View key={page.title} style={{ width }} className="px-7 pt-7">
            <Text className="text-[26px] font-extrabold leading-9 text-gray-900 dark:text-white">
              {page.title}
            </Text>
            <Text className="mt-3 text-[15px] leading-6 text-gray-500 dark:text-gray-400">
              {page.description}
            </Text>

            <View className="mt-5">
              {page.highlights.map((highlight, i) => (
                <Animated.View
                  key={highlight}
                  entering={
                    index === pageIndex
                      ? FadeInRight.delay(120 + i * 90).duration(320)
                      : undefined
                  }
                  className="mb-2.5 flex-row items-center"
                >
                  <View className="mr-2.5 h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
                    <Ionicons name="checkmark" size={12} color={palette.primary[600]} />
                  </View>
                  <Text className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                    {highlight}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <View className="flex-1 justify-end px-7" style={{ paddingBottom: insets.bottom + 18 }}>
        <View className="mb-5 flex-row items-center">
          {pages.map((page, index) => (
            <View
              key={page.title}
              className={`mr-1.5 h-1.5 rounded-full ${
                index === pageIndex ? 'w-7 bg-primary-600' : 'w-1.5 bg-gray-300 dark:bg-gray-700'
              }`}
            />
          ))}
          <View className="flex-1" />
          <Text className="text-xs font-medium text-gray-400">
            {pageIndex + 1} / {pages.length}
          </Text>
        </View>

        <Button
          label={isLast ? 'Get Started' : 'Next'}
          onPress={() => (isLast ? finish() : goToPage(pageIndex + 1))}
          iconPosition={isLast ? 'left' : 'right'}
          icon={
            <Ionicons
              name={isLast ? 'rocket-outline' : 'arrow-forward'}
              size={17}
              color="#fff"
            />
          }
        />
      </View>
    </View>
  );
}
