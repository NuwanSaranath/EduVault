import { Dimensions, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Card, GradientHeader, ProgressBar, ScreenContainer, SectionHeader } from '@/components';
import { baselineStats, improvementTrend, weeklyStudyHours } from '@/constants/data/progressChartData';
import { chartColors, palette } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import {
  computeSubjectProgress,
  fetchSubjectChapterStats,
  fetchWeakestChapters,
} from '@/services/progress';
import { fetchSubjectsForStream } from '@/services/subjects';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { formatPercent } from '@/utils/format';

const screenWidth = Dimensions.get('window').width - 40;

export function ProgressScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? chartColors.dark : chartColors.light;

  const user = useAuthStore((s) => s.user);
  const { quizAttempts, pastPaperResults, xp } = useProgressStore();
  const stream = user?.stream ?? 'Physical Science';

  /**
   * Subjects and their lesson totals both come from SQLite, so this screen is
   * fully readable offline. Chapter stats are fetched per subject in one pass
   * rather than inside the render loop, which would fire a query per row on
   * every re-render.
   */
  const { data: subjectRows } = useAsyncData(async () => {
    const subjects = await fetchSubjectsForStream(stream);
    return Promise.all(
      subjects.map(async (subject) => ({
        subject,
        chapterStats: await fetchSubjectChapterStats(subject.id),
      })),
    );
  }, [stream]);

  // Same ranking the adaptive quiz selector uses — one source of truth, so the
  // weak areas named here are exactly the ones the next quiz will drill.
  const { data: weakest } = useAsyncData(() => fetchWeakestChapters(3), [quizAttempts.length]);

  const subjectProgress = (subjectRows ?? []).map(({ subject, chapterStats }) => ({
    subject,
    progress: computeSubjectProgress(
      subject.id,
      quizAttempts,
      pastPaperResults.length === 0
        ? 0
        : (pastPaperResults[0].score / pastPaperResults[0].totalMarks) * 100,
      chapterStats,
    ),
  }));

  const totalQuestions = baselineStats.totalQuestions + quizAttempts.reduce((s, a) => s + a.totalQuestions, 0);
  const correctAnswers = baselineStats.correctAnswers + quizAttempts.reduce((s, a) => s + a.score, 0);

  const chartConfig = {
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 95, 224, ${opacity})`,
    labelColor: () => colors.label,
    propsForBackgroundLines: { stroke: colors.grid },
    barPercentage: 0.6,
  };

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <GradientHeader>
        <Text className="text-2xl font-extrabold text-white">Progress</Text>
        <Text className="mt-1 text-sm text-white/80">Level {Math.floor(xp / 500) + 1} · {xp} XP</Text>
      </GradientHeader>

      <View className="px-5 pt-5">
        <SectionHeader title="Overall Progress" />
        {subjectProgress.map(({ subject, progress }) => (
          <Card key={subject.id} className="mb-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">{subject.name}</Text>
              <Text className="text-sm font-bold text-primary-600 dark:text-primary-300">
                {formatPercent(progress.theoryPercent)}
              </Text>
            </View>
            <ProgressBar percent={progress.theoryPercent} />
          </Card>
        ))}

        <View className="my-6 flex-row gap-3">
          <Card className="flex-1 items-center">
            <Ionicons name="help-circle-outline" size={20} color={palette.primary[600]} />
            <Text className="mt-1 text-base font-bold text-gray-900 dark:text-white">{totalQuestions}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">Total Questions</Text>
          </Card>
          <Card className="flex-1 items-center">
            <Ionicons name="checkmark-circle-outline" size={20} color={palette.success} />
            <Text className="mt-1 text-base font-bold text-gray-900 dark:text-white">{correctAnswers}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">Correct</Text>
          </Card>
          <Card className="flex-1 items-center">
            <Ionicons name="time-outline" size={20} color={palette.accent[600]} />
            <Text className="mt-1 text-base font-bold text-gray-900 dark:text-white">{baselineStats.studyHours}h</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">Study Time</Text>
          </Card>
        </View>

        <SectionHeader title="Weekly Study Chart" />
        <Card className="mb-6 items-center">
          <BarChart
            data={{ labels: weeklyStudyHours.labels, datasets: [{ data: weeklyStudyHours.data }] }}
            width={screenWidth}
            height={200}
            fromZero
            yAxisLabel=""
            yAxisSuffix="h"
            chartConfig={chartConfig}
            style={{ borderRadius: 16 }}
          />
        </Card>

        {/* Focus areas, ranked by the same algorithm that picks quiz questions. */}
        {weakest && weakest.length > 0 ? (
          <>
            <SectionHeader title="Focus Next" />
            <Card className="mb-6">
              <Text className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Your next practice session will weight these topics more heavily.
              </Text>
              {weakest.map((topic) => (
                <View key={topic.topicId} className="mb-3">
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {topic.topicId}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {formatPercent(Math.round(topic.accuracy * 100))} over {topic.seen}
                    </Text>
                  </View>
                  <ProgressBar
                    percent={topic.accuracy * 100}
                    colors={[palette.warning, palette.danger]}
                  />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <SectionHeader title="Subject Performance" />
        <Card className="mb-6 items-center">
          {/* chart-kit throws on an empty dataset, and this data arrives async. */}
          {subjectProgress.length === 0 ? (
            <Text className="py-8 text-sm text-gray-500 dark:text-gray-400">
              Take a quiz to see your subject breakdown.
            </Text>
          ) : (
            <BarChart
              data={{
                labels: subjectProgress.map(({ subject }) => subject.name.split(' ')[0]),
                datasets: [
                  { data: subjectProgress.map(({ progress }) => progress.theoryPercent) },
                ],
              }}
              width={screenWidth}
              height={200}
              fromZero
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={chartConfig}
              style={{ borderRadius: 16 }}
            />
          )}
        </Card>

        <SectionHeader title="Improvement Graph" />
        <Card className="mb-4 items-center">
          <LineChart
            data={{ labels: improvementTrend.labels, datasets: [{ data: improvementTrend.data }] }}
            width={screenWidth}
            height={200}
            yAxisSuffix="%"
            bezier
            chartConfig={chartConfig}
            style={{ borderRadius: 16 }}
          />
        </Card>
      </View>
    </ScreenContainer>
  );
}
