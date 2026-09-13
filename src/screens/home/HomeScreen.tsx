import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Badge,
  Card,
  ExamCountdownRing,
  GradientHeader,
  ProgressBar,
  ScreenContainer,
  SectionHeader,
} from '@/components';
import { palette } from '@/constants/theme';
import { AL_EXAM_DATE_ISO, DAILY_MCQ_GOAL } from '@/constants/examConfig';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fetchRecommendedLessons } from '@/services/theory';
import { fetchOverallChapterStats } from '@/services/progress';
import { fetchSubject } from '@/services/subjects';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { daysUntil, formatPercent, greetingForHour } from '@/utils/format';

const quickActions = [
  { key: 'theory', label: 'Theory', icon: 'book' as const, route: '/(tabs)/subjects' as const },
  {
    key: 'past-papers',
    label: 'Past Papers',
    icon: 'document-text' as const,
    route: '/past-papers' as const,
  },
  { key: 'flashcards', label: 'Flashcards', icon: 'albums' as const, route: '/flashcards' as const },
  { key: 'quiz', label: 'Quiz', icon: 'bulb' as const, route: '/quiz' as const },
];

/** Full length of the study plan, used as the countdown ring's full sweep. */
const STUDY_PLAN_DAYS = 365;

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const {
    streakDays,
    todayGoalTarget,
    todayCompletedCount,
    quizAttempts,
    pastPaperResults,
    completedChapterIds,
  } = useProgressStore();

  // Chapter totals come from SQLite rather than a hardcoded divisor, so theory
  // progress stays correct when content is added by a sync.
  const { data: chapterStats } = useAsyncData(() => fetchOverallChapterStats(), []);

  const { data: recommended } = useAsyncData(
    () => fetchRecommendedLessons(completedChapterIds, 3),
    [completedChapterIds.join(',')],
  );

  const { data: recommendedSubjects } = useAsyncData(async () => {
    const ids = [
      ...new Set((recommended ?? []).map((lesson) => lesson.chapterId.split('-ch')[0])),
    ];
    const entries = await Promise.all(
      ids.map(async (id) => [id, (await fetchSubject(id))?.name ?? 'Subject'] as const),
    );
    return Object.fromEntries(entries);
  }, [(recommended ?? []).map((l) => l.id).join(',')]);

  const totalLessons = chapterStats?.total ?? 0;
  const completedLessons = chapterStats?.completed ?? 0;
  const theoryPercent = totalLessons === 0 ? 0 : (completedLessons / totalLessons) * 100;

  // Zero when there is no history, not a flattering placeholder. A student
  // deciding what to revise needs their real numbers.
  const quizAvg =
    quizAttempts.length === 0
      ? 0
      : (quizAttempts.reduce((sum, a) => sum + a.score / Math.max(1, a.totalQuestions), 0) /
          quizAttempts.length) *
        100;

  const pastPaperAvg =
    pastPaperResults.length === 0
      ? 0
      : (pastPaperResults.reduce((sum, r) => sum + r.score / Math.max(1, r.totalMarks), 0) /
          pastPaperResults.length) *
        100;

  const goalTarget = todayGoalTarget ?? DAILY_MCQ_GOAL;

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-base text-white/80">
              {greetingForHour(new Date().getHours())},
            </Text>
            <Text className="text-2xl font-extrabold text-white">
              {user?.name?.split(' ')[0] ?? 'Student'} 👋
            </Text>
          </View>
          <View className="flex-row items-center rounded-full bg-white/15 px-3 py-1.5">
            <Text className="text-base">🔥</Text>
            <Text className="ml-1 text-sm font-bold text-white">{streakDays} Days</Text>
          </View>
        </View>

        <View className="mt-4 rounded-2xl bg-white/15 p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-xs text-white/70">Today&apos;s Goal</Text>
            <Text className="text-xs font-semibold text-white">
              {todayCompletedCount}/{goalTarget} MCQs
            </Text>
          </View>
          <ProgressBar
            percent={(todayCompletedCount / Math.max(1, goalTarget)) * 100}
            colors={['#ffffff', '#ffffff']}
          />
        </View>
      </GradientHeader>

      <View className="px-5 pt-5">
        {/* Custom component: segmented SVG countdown, tappable through to the
            planner. Sits on the card surface rather than the gradient header so
            its own colour ramp is the only signal competing for attention. */}
        <Card className="mb-5 items-center py-6">
          <ExamCountdownRing
            daysRemaining={daysUntil(AL_EXAM_DATE_ISO)}
            totalDays={STUDY_PLAN_DAYS}
            onPress={() => router.push('/planner')}
          />
          <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Tap to open your study planner
          </Text>
        </Card>

        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Text className="text-xs text-gray-500 dark:text-gray-400">Theory</Text>
            <Text className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {formatPercent(theoryPercent)}
            </Text>
            <ProgressBar percent={theoryPercent} height={5} />
          </Card>
          <Card className="flex-1">
            <Text className="text-xs text-gray-500 dark:text-gray-400">Past Papers</Text>
            <Text className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {formatPercent(pastPaperAvg)}
            </Text>
            <ProgressBar percent={pastPaperAvg} height={5} colors={['#8B5CF6', '#4F5FE0']} />
          </Card>
          <Card className="flex-1">
            <Text className="text-xs text-gray-500 dark:text-gray-400">Quiz Score</Text>
            <Text className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {formatPercent(quizAvg)}
            </Text>
            <ProgressBar percent={quizAvg} height={5} colors={['#22C55E', '#4F5FE0']} />
          </Card>
        </View>

        <View className="mt-6">
          <SectionHeader title="Quick Actions" />
          <View className="flex-row justify-between">
            {quickActions.map((action) => (
              <View key={action.key} className="items-center" style={{ width: '23%' }}>
                <Card onPress={() => router.push(action.route)} className="w-full items-center py-4">
                  <Ionicons name={action.icon} size={22} color={palette.primary[600]} />
                </Card>
                <Text className="mt-1.5 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
                  {action.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mb-2 mt-6">
          <SectionHeader title="Recommended Lessons" />
          {!recommended || recommended.length === 0 ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              You&apos;re all caught up — great work!
            </Text>
          ) : (
            recommended.map((lesson) => (
              <Card
                key={lesson.id}
                onPress={() => router.push(`/theory/${lesson.chapterId}/${lesson.id}`)}
                className="mb-3"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Badge
                      label={recommendedSubjects?.[lesson.chapterId.split('-ch')[0]] ?? 'Subject'}
                      tone="primary"
                    />
                    <Text className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                      {lesson.title}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.gray[400]} />
                </View>
              </Card>
            ))
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
