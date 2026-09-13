import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AnswerSheetGrid,
  Badge,
  Button,
  Card,
  EmptyState,
  ScreenContainer,
  SectionHeader,
} from '@/components';
import { palette } from '@/constants/theme';
import { useExamStore } from '@/store/examStore';
import { formatDuration } from '@/utils/format';

export function PastPaperResultScreen() {
  const lastResult = useExamStore((s) => s.lastResult);
  const lastSheet = useExamStore((s) => s.lastSheet);

  if (!lastResult) {
    return (
      <ScreenContainer>
        <EmptyState icon="document-text-outline" title="No result available" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll edges={['top', 'bottom']}>
      <View className="items-center px-6 pt-12">
        <View className="mb-4 h-28 w-28 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/40">
          <Text className="text-2xl font-extrabold text-primary-600 dark:text-primary-300">
            {lastResult.score}/{lastResult.totalMarks}
          </Text>
        </View>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Exam Completed</Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Completed in {formatDuration(lastResult.durationSeconds)}
        </Text>
      </View>

      <View className="mt-6 px-5">
        <Card>
          <View className="mb-3 flex-row items-center">
            <Ionicons name="alert-circle-outline" size={18} color={palette.warning} />
            <Text className="ml-2 text-base font-bold text-gray-900 dark:text-white">Weak Areas</Text>
          </View>
          {lastResult.weakAreas.length === 0 ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Great job — no significant weak areas detected!
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {lastResult.weakAreas.map((area) => (
                <Badge key={area} label={area} tone="warning" />
              ))}
            </View>
          )}
        </Card>
      </View>

      {/* The same sheet the student filled in, replayed in review mode: their
          answer, the correct answer, and where those differ. */}
      {lastSheet ? (
        <View className="mt-6 px-5">
          <SectionHeader title="Your Answer Sheet" />
          <Card>
            <AnswerSheetGrid
              questionCount={lastSheet.questionCount}
              optionsPerQuestion={lastSheet.optionsPerQuestion}
              answers={lastSheet.answers}
              correctAnswers={lastSheet.correctAnswers}
              mode="review"
              onAnswerChange={() => {
                // Locked in review mode; the grid never calls this.
              }}
            />
            <View className="mt-4 flex-row flex-wrap gap-4">
              <LegendDot color={palette.success} label="Correct" />
              <LegendDot color={palette.danger} label="Your wrong answer" />
              <LegendDot color={palette.gray[300]} label="Not chosen" />
            </View>
          </Card>
        </View>
      ) : null}

      <View className="px-5 pb-6 pt-6">
        <Button label="Back to Past Papers" onPress={() => router.replace('/past-papers')} />
      </View>
    </ScreenContainer>
  );
}

/** Small colour key for the review-mode answer sheet. */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ backgroundColor: color }} className="h-3 w-3 rounded-full" />
      <Text className="text-[11px] text-gray-500 dark:text-gray-400">{label}</Text>
    </View>
  );
}
