import { useMemo, useState } from 'react';
import { Modal, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Card,
  EmptyState,
  GradientHeader,
  LoadingSpinner,
  ProgressBar,
  ScreenContainer,
} from '@/components';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fetchChapter, fetchLessons } from '@/services/theory';
import { fetchSubject } from '@/services/subjects';
import { palette } from '@/constants/theme';
import { useBookmarkStore } from '@/store/bookmarkStore';

/**
 * Lists the topics (lessons) inside a chapter. Tapping a topic opens it on its
 * own page — see app/theory/[chapterId]/[lessonId].tsx.
 */
export function TheoryChapterScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const { data: chapter, loading: chapterLoading } = useAsyncData(
    () => fetchChapter(chapterId),
    [chapterId],
  );
  const { data: lessons, loading: lessonsLoading } = useAsyncData(
    () => fetchLessons(chapterId),
    [chapterId],
  );
  const { data: subject } = useAsyncData(
    async () => (chapter ? fetchSubject(chapter.subjectId) : undefined),
    [chapter?.subjectId],
  );

  const allLessons = lessons ?? [];

  const [query, setQuery] = useState('');
  const [pdfVisible, setPdfVisible] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done'>('idle');

  const isBookmarked = useBookmarkStore((s) => s.isBookmarked);

  const filteredLessons = useMemo(
    () => allLessons.filter((l) => l.title.toLowerCase().includes(query.trim().toLowerCase())),
    [allLessons, query],
  );

  if (chapterLoading || lessonsLoading) {
    return (
      <ScreenContainer>
        <LoadingSpinner />
      </ScreenContainer>
    );
  }

  if (!chapter || !subject) {
    return (
      <ScreenContainer>
        <EmptyState icon="alert-circle-outline" title="Chapter not found" />
      </ScreenContainer>
    );
  }

  const downloadPdf = async () => {
    setDownloadState('downloading');
    try {
      const dest = `${FileSystem.documentDirectory}${chapter.id}.pdf`;
      await FileSystem.downloadAsync(chapter.pdfUrl, dest);
      setDownloadState('done');
    } catch {
      setDownloadState('idle');
    }
  };

  const completedCount = allLessons.filter((l) => l.completed).length;
  const percent = allLessons.length === 0 ? 0 : (completedCount / allLessons.length) * 100;

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <GradientHeader colors={[subject.color, palette.accent[600]]}>
        <View className="flex-row items-center justify-between">
          <Ionicons name="chevron-back" size={24} color="#fff" onPress={() => router.back()} suppressHighlighting />
          <View className="flex-row gap-4">
            <Ionicons
              name={downloadState === 'done' ? 'checkmark-circle' : 'cloud-download-outline'}
              size={22}
              color="#fff"
              onPress={downloadState === 'idle' ? downloadPdf : undefined}
              suppressHighlighting
            />
            <Ionicons
              name="document-text-outline"
              size={22}
              color="#fff"
              onPress={() => setPdfVisible(true)}
              suppressHighlighting
            />
          </View>
        </View>

        <Text className="mt-3 text-2xl font-extrabold text-white">{chapter.title}</Text>
        <Text className="text-sm text-white/80">
          {subject.name} · {allLessons.length} {allLessons.length === 1 ? 'topic' : 'topics'}
        </Text>

        <View className="mt-4 flex-row items-center rounded-2xl bg-white/15 px-3 py-2.5">
          <Ionicons name="search" size={16} color="#fff" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search topics..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            className="ml-2 flex-1 text-sm text-white"
          />
        </View>
      </GradientHeader>

      <View className="px-5 pt-5">
        {/* Chapter-level progress across its topics. */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">Chapter Progress</Text>
            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {completedCount}/{allLessons.length} complete
            </Text>
          </View>
          <View className="mt-3">
            <ProgressBar percent={percent} height={6} />
          </View>
        </Card>

        {filteredLessons.length === 0 ? (
          <EmptyState icon="search-outline" title="No topics match your search" />
        ) : (
          filteredLessons.map((lesson) => {
            const topicNumber = allLessons.findIndex((l) => l.id === lesson.id) + 1;
            const hasGuidedContent = Boolean(lesson.practiceItems?.length || lesson.imageSuggestions?.length);

            return (
              <Card
                key={lesson.id}
                onPress={() => router.push(`/theory/${chapter.id}/${lesson.id}`)}
                className="mb-3"
              >
                <View className="flex-row items-center">
                  <View
                    className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${
                      lesson.completed ? 'bg-green-100 dark:bg-green-900/40' : 'bg-primary-50 dark:bg-primary-900/40'
                    }`}
                  >
                    {lesson.completed ? (
                      <Ionicons name="checkmark" size={18} color={palette.success} />
                    ) : (
                      <Text className="text-xs font-bold text-gray-600 dark:text-gray-300">{topicNumber}</Text>
                    )}
                  </View>

                  <View className="flex-1">
                    {lesson.sectionNumber ? (
                      <Text className="mb-0.5 text-xs font-bold text-primary-600 dark:text-primary-300">
                        {lesson.sectionNumber}
                      </Text>
                    ) : null}
                    <Text className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                      {lesson.title}
                    </Text>

                    {/* Sub-topics as printed in the resource book's contents page. */}
                    {lesson.subtopics?.length ? (
                      <View className="mt-2">
                        {lesson.subtopics.map((subtopic) => (
                          <View key={subtopic} className="mb-1 flex-row items-start">
                            <Text className="mr-1.5 text-xs leading-5 text-gray-400">•</Text>
                            <Text className="flex-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                              {subtopic}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <View className="mt-1.5 flex-row flex-wrap items-center">
                      {hasGuidedContent ? (
                        <View className="mr-2 flex-row items-center">
                          <Ionicons name="sparkles-outline" size={12} color={palette.accent[600]} />
                          <Text className="ml-1 text-xs text-gray-500 dark:text-gray-400">Guided lesson</Text>
                        </View>
                      ) : null}
                      {lesson.practiceItems?.length ? (
                        <Text className="mr-2 text-xs text-gray-500 dark:text-gray-400">
                          {lesson.practiceItems.length} practice Qs
                        </Text>
                      ) : null}
                      {isBookmarked(lesson.id) ? (
                        <Ionicons name="bookmark" size={12} color={palette.primary[600]} />
                      ) : null}
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={palette.gray[400]}
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </Card>
            );
          })
        )}
      </View>

      <Modal visible={pdfVisible} animationType="slide">
        <View className="flex-1 bg-black">
          <View className="flex-row items-center justify-between bg-surface-dark px-4 py-3 pt-14">
            <Text className="text-base font-semibold text-white">{chapter.title} — PDF</Text>
            <Ionicons name="close" size={24} color="#fff" onPress={() => setPdfVisible(false)} suppressHighlighting />
          </View>
          <WebView source={{ uri: chapter.pdfUrl }} style={{ flex: 1 }} />
        </View>
      </Modal>
    </ScreenContainer>
  );
}
