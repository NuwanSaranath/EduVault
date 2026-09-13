import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, EmptyState, ScreenContainer } from '@/components';
import { palette } from '@/constants/theme';
import { useQuizStore } from '@/store/quizStore';
import { formatDuration } from '@/utils/format';

export function QuizResultScreen() {
  const { lastResult, questions, answers, resetSession } = useQuizStore();

  if (!lastResult) {
    return (
      <ScreenContainer>
        <EmptyState icon="bulb-outline" title="No quiz result to show" />
      </ScreenContainer>
    );
  }

  const { correctCount, totalQuestions, xpEarned, durationSeconds } = lastResult;
  const wrongCount = totalQuestions - correctCount;
  const percent = Math.round((correctCount / totalQuestions) * 100);

  const finish = () => {
    resetSession();
    router.replace('/(tabs)/practice');
  };

  return (
    <ScreenContainer scroll edges={['top', 'bottom']}>
      <View className="items-center px-6 pt-10">
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/40">
          <Text className="text-3xl font-extrabold text-primary-600 dark:text-primary-300">{percent}%</Text>
        </View>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {percent >= 80 ? 'Excellent work!' : percent >= 50 ? 'Good effort!' : 'Keep practicing!'}
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {correctCount}/{totalQuestions} correct · {formatDuration(durationSeconds)}
        </Text>

        <View className="mt-6 w-full flex-row gap-3">
          <Card className="flex-1 items-center">
            <Ionicons name="checkmark-circle" size={22} color={palette.success} />
            <Text className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{correctCount}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">Correct</Text>
          </Card>
          <Card className="flex-1 items-center">
            <Ionicons name="close-circle" size={22} color={palette.danger} />
            <Text className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{wrongCount}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">Wrong</Text>
          </Card>
          <Card className="flex-1 items-center">
            <Ionicons name="star" size={22} color={palette.warning} />
            <Text className="mt-1 text-lg font-bold text-gray-900 dark:text-white">+{xpEarned}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">XP Earned</Text>
          </Card>
        </View>
      </View>

      <View className="mt-6 px-5">
        <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">Review</Text>
        {questions.map((question) => {
          const given = answers[question.id] ?? '';
          const correct = given.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
          return (
            <Card key={question.id} className="mb-3">
              <View className="mb-1 flex-row items-center justify-between">
                <Badge label={question.type} tone="neutral" />
                <Ionicons
                  name={correct ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={correct ? palette.success : palette.danger}
                />
              </View>
              <Text className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">{question.prompt}</Text>
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Your answer: {given || '—'} · Correct: {question.correctAnswer}
              </Text>
            </Card>
          );
        })}
      </View>

      <View className="px-5 pb-6 pt-2">
        <Button label="Done" onPress={finish} />
      </View>
    </ScreenContainer>
  );
}
