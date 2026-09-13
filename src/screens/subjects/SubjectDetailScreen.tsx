import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  EmptyState,
  GradientHeader,
  LoadingSpinner,
  ProgressBar,
  ScreenContainer,
} from '@/components';
import { palette } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fetchSubject } from '@/services/subjects';
import { fetchChapters } from '@/services/theory';

export function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: subject, loading: subjectLoading } = useAsyncData(() => fetchSubject(id), [id]);
  const { data: chapters, loading: chaptersLoading } = useAsyncData(
    () => fetchChapters(id),
    [id],
  );

  if (subjectLoading || chaptersLoading) {
    return (
      <ScreenContainer>
        <LoadingSpinner />
      </ScreenContainer>
    );
  }

  if (!subject) {
    return (
      <ScreenContainer>
        <EmptyState icon="alert-circle-outline" title="Subject not found" />
      </ScreenContainer>
    );
  }

  const chapterList = chapters ?? [];

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <GradientHeader colors={[subject.color, palette.accent[600]]}>
        <Ionicons
          name="chevron-back"
          size={24}
          color="#fff"
          onPress={() => router.back()}
          suppressHighlighting
        />
        <View className="mt-3 flex-row items-center">
          <View className="mr-3 h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Ionicons name={subject.icon as never} size={26} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-extrabold text-white">{subject.name}</Text>
            <Text className="text-sm text-white/80">{chapterList.length} chapters</Text>
          </View>
        </View>
      </GradientHeader>

      <View className="px-5 pt-5">
        {chapterList.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No chapters cached yet"
            description="Chapters appear here once content has synced."
          />
        ) : (
          chapterList.map((chapter) => {
            const percent =
              chapter.totalLessons === 0
                ? 0
                : (chapter.completedLessons / chapter.totalLessons) * 100;
            const isComplete =
              chapter.totalLessons > 0 && chapter.completedLessons === chapter.totalLessons;

            return (
              <Card
                key={chapter.id}
                onPress={() => router.push(`/theory/${chapter.id}`)}
                className="mb-3"
              >
                <View className="flex-row items-center">
                  <View
                    className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${
                      isComplete
                        ? 'bg-green-100 dark:bg-green-900/40'
                        : 'bg-primary-50 dark:bg-primary-900/40'
                    }`}
                  >
                    <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      {chapter.order}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900 dark:text-white">
                      {chapter.title}
                    </Text>
                    <View className="mt-2 flex-row items-center">
                      <View className="mr-3 flex-1">
                        <ProgressBar percent={percent} height={5} />
                      </View>
                      <Text className="text-xs text-gray-400">
                        {chapter.completedLessons}/{chapter.totalLessons}
                      </Text>
                    </View>
                  </View>
                  {isComplete ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={palette.success}
                      style={{ marginLeft: 8 }}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={palette.gray[400]}
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </View>
              </Card>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}
