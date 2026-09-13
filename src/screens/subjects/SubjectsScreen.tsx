import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, LoadingSpinner, ProgressBar, ScreenContainer, SectionHeader } from '@/components';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useStreamSubjects } from '@/hooks/useStreamSubjects';
import { fetchChapters } from '@/services/theory';
import { useAuthStore } from '@/store/authStore';
import { formatPercent } from '@/utils/format';

export function SubjectsScreen() {
  const user = useAuthStore((s) => s.user);
  const { subjects, loading: subjectsLoading } = useStreamSubjects();

  /**
   * Chapter rows for every subject, fetched in one pass.
   *
   * Doing this inside the render loop would issue a query per card on every
   * re-render; keyed on the subject ids so it re-runs only when the list itself
   * changes, not on each paint.
   */
  const { data: chapterRows } = useAsyncData(
    async () =>
      Object.fromEntries(
        await Promise.all(
          subjects.map(async (subject) => [subject.id, await fetchChapters(subject.id)] as const),
        ),
      ),
    [subjects.map((s) => s.id).join(',')],
  );

  if (!user || subjectsLoading) return <LoadingSpinner />;

  return (
    <ScreenContainer scroll>
      <View className="px-5 pt-6">
        <Text className="mb-1 text-2xl font-extrabold text-gray-900 dark:text-white">Subjects</Text>
        <Text className="mb-5 text-sm text-gray-500 dark:text-gray-400">{user.stream} stream</Text>

        <SectionHeader title={`${subjects.length} Subjects`} />

        {subjects.map((subject) => {
          const chapters = chapterRows?.[subject.id] ?? [];
          const totalLessons = chapters.reduce((sum, c) => sum + c.totalLessons, 0);
          const completedLessons = chapters.reduce((sum, c) => sum + c.completedLessons, 0);
          const percent = totalLessons === 0 ? 0 : (completedLessons / totalLessons) * 100;
          const completedChapters = chapters.filter(
            (c) => c.totalLessons > 0 && c.completedLessons === c.totalLessons,
          ).length;

          return (
            <Card
              key={subject.id}
              onPress={() => router.push(`/subject/${subject.id}`)}
              className="mb-3"
            >
              <View className="flex-row items-center">
                <View
                  className="mr-3 h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${subject.color}1A` }}
                >
                  <Ionicons name={subject.icon as never} size={22} color={subject.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">
                    {subject.name}
                  </Text>
                  <View className="mt-2 flex-row items-center">
                    <View className="mr-3 flex-1">
                      <ProgressBar percent={percent} height={6} />
                    </View>
                    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {formatPercent(percent)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {completedChapters}/{chapters.length} Chapters
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </ScreenContainer>
  );
}
