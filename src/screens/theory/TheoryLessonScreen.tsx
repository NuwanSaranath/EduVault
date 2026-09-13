import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import {
  Badge,
  Card,
  EmptyState,
  GradientHeader,
  LoadingSpinner,
  ScreenContainer,
} from '@/components';
import { useAsyncData } from '@/hooks/useAsyncData';
import { getQuestionsByIds } from '@/db/repositories/contentRepo';
import { fetchChapter, fetchLesson, fetchLessons } from '@/services/theory';
import { fetchSubject } from '@/services/subjects';
import { palette } from '@/constants/theme';
import { useBookmarkStore } from '@/store/bookmarkStore';
import { useProgressStore } from '@/store/progressStore';
import type { Lesson } from '@/types';

type ReaderTab =
  | 'Notes'
  | 'Important Points'
  | 'Formula Sheet'
  | 'Visuals'
  | 'Memory Tricks'
  | 'Exam Tips'
  | 'Practice'
  | 'Summary'
  | 'Related Questions';

/**
 * Tabs are derived per lesson: the guided-teaching tabs only appear for lessons
 * that actually carry that content, so simpler lessons keep the original five.
 */
function tabsForLesson(lesson: Lesson | null): ReaderTab[] {
  const tabs: ReaderTab[] = ['Notes', 'Important Points', 'Formula Sheet'];
  if (!lesson) return [...tabs, 'Summary', 'Related Questions'];

  const visualCount = (lesson.imageSuggestions?.length ?? 0) + (lesson.videoSuggestions?.length ?? 0);
  if (visualCount > 0) tabs.push('Visuals');
  if (lesson.memoryTricks?.length) tabs.push('Memory Tricks');
  if ((lesson.commonMistakes?.length ?? 0) + (lesson.examTips?.length ?? 0) > 0) tabs.push('Exam Tips');
  if (lesson.practiceItems?.length) tabs.push('Practice');

  return [...tabs, 'Summary', 'Related Questions'];
}

/** A single topic, opened as its own page from the chapter's topic list. */
export function TheoryLessonScreen() {
  const { chapterId, lessonId } = useLocalSearchParams<{ chapterId: string; lessonId: string }>();
  const { data: chapter, loading: chapterLoading } = useAsyncData(
    () => fetchChapter(chapterId),
    [chapterId],
  );
  const { data: lessons } = useAsyncData(() => fetchLessons(chapterId), [chapterId]);
  const { data: subject } = useAsyncData(
    async () => (chapter ? fetchSubject(chapter.subjectId) : undefined),
    [chapter?.subjectId],
  );

  // Fetched individually rather than picked out of the chapter's lesson list,
  // because fetchLesson also stamps last_read_at — that write is what marks the
  // lesson as recently used and protects it from LRU cache eviction.
  const { data: fetchedLesson, loading: lessonLoading } = useAsyncData(
    () => fetchLesson(lessonId),
    [lessonId],
  );

  const allLessons = lessons ?? [];
  const lesson = fetchedLesson ?? null;

  const [activeTab, setActiveTab] = useState<ReaderTab>('Notes');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  // Practice answers stay hidden until the student asks for them.
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);
  const isBookmarked = useBookmarkStore((s) => s.isBookmarked);
  const markChapterCompleted = useProgressStore((s) => s.markChapterCompleted);

  const readerTabs = useMemo(() => tabsForLesson(lesson), [lesson]);

  const { data: related } = useAsyncData(
    () => getQuestionsByIds(fetchedLesson?.relatedQuestionIds ?? []),
    [fetchedLesson?.id],
  );
  const relatedQuestions = related ?? [];

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  if (chapterLoading || lessonLoading) {
    return (
      <ScreenContainer>
        <LoadingSpinner />
      </ScreenContainer>
    );
  }

  if (!chapter || !subject || !lesson) {
    return (
      <ScreenContainer>
        <EmptyState icon="alert-circle-outline" title="Topic not found" />
      </ScreenContainer>
    );
  }

  const toggleAudio = async () => {
    if (!lesson.audioUrl) return;
    if (sound && playing) {
      await sound.pauseAsync();
      setPlaying(false);
      return;
    }
    if (sound) {
      await sound.playAsync();
      setPlaying(true);
      return;
    }
    const { sound: newSound } = await Audio.Sound.createAsync({ uri: lesson.audioUrl });
    setSound(newSound);
    setPlaying(true);
    await newSound.playAsync();
  };


  const topicIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const previousLesson = topicIndex > 0 ? allLessons[topicIndex - 1] : null;
  const nextLesson = topicIndex < allLessons.length - 1 ? allLessons[topicIndex + 1] : null;

  return (
    <ScreenContainer edges={['bottom']}>
      <GradientHeader colors={[subject.color, palette.accent[600]]}>
        <View className="flex-row items-center justify-between">
          <Ionicons name="chevron-back" size={24} color="#fff" onPress={() => router.back()} suppressHighlighting />
          <View className="flex-row items-center gap-4">
            {lesson.audioUrl ? (
              <Ionicons
                name={playing ? 'pause-circle' : 'play-circle'}
                size={24}
                color="#fff"
                onPress={toggleAudio}
                suppressHighlighting
              />
            ) : null}
            <Ionicons
              name={isBookmarked(lesson.id) ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color="#fff"
              onPress={() => toggleBookmark(lesson.id)}
              suppressHighlighting
            />
          </View>
        </View>

        <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/70">
          {chapter.title} · Topic {topicIndex + 1} of {allLessons.length}
        </Text>
        <Text className="mt-1 text-xl font-extrabold leading-7 text-white">
          {lesson.sectionNumber ? `${lesson.sectionNumber} ` : ''}
          {lesson.title}
        </Text>
      </GradientHeader>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <Card>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {readerTabs.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`mr-2 rounded-full px-3.5 py-1.5 ${
                  activeTab === tab ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    activeTab === tab
                      ? 'text-primary-700 dark:text-primary-200'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {activeTab === 'Notes' && (
            <View>
              {/* Sub-topics covered, as printed in the resource book. */}
              {lesson.subtopics?.length ? (
                <View className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/60">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    මෙම කොටසේ අන්තර්ගතය
                  </Text>
                  {lesson.subtopics.map((subtopic) => (
                    <View key={subtopic} className="mb-1 flex-row items-start">
                      <Text className="mr-1.5 text-xs leading-5 text-primary-600">•</Text>
                      <Text className="flex-1 text-xs leading-5 text-gray-700 dark:text-gray-300">{subtopic}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {lesson.intro ? (
                <View className="mb-4 rounded-2xl bg-primary-50 p-4 dark:bg-primary-900/30">
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                    පාඩම ආරම්භය
                  </Text>
                  <Text className="text-base leading-6 text-gray-800 dark:text-gray-200">{lesson.intro}</Text>
                </View>
              ) : null}

              {lesson.whyImportant ? (
                <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
                  <View className="mb-1 flex-row items-center">
                    <Ionicons name="star" size={14} color={palette.warning} />
                    <Text className="ml-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      මේක ඇයි වැදගත්?
                    </Text>
                  </View>
                  <Text className="text-base leading-6 text-gray-800 dark:text-gray-200">{lesson.whyImportant}</Text>
                </View>
              ) : null}

              <Text className="text-base leading-6 text-gray-700 dark:text-gray-300">{lesson.notes}</Text>

              {lesson.realLifeExamples?.length ? (
                <View className="mt-5">
                  <Text className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                    එදිනෙදා ජීවිතයෙන් උදාහරණ
                  </Text>
                  {lesson.realLifeExamples.map((example) => (
                    <View key={example} className="mb-2 rounded-xl bg-green-50 px-3 py-2.5 dark:bg-green-900/25">
                      <Text className="text-sm leading-5 text-gray-800 dark:text-gray-200">{example}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          {activeTab === 'Important Points' &&
            (lesson.importantPoints.length === 0 ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400">No key points listed.</Text>
            ) : (
              lesson.importantPoints.map((point) => (
                <View key={point} className="mb-2 flex-row items-start">
                  <Text className="mr-2 text-primary-600">•</Text>
                  <Text className="flex-1 text-base leading-6 text-gray-700 dark:text-gray-300">{point}</Text>
                </View>
              ))
            ))}

          {activeTab === 'Formula Sheet' &&
            (lesson.formulaSheet.length === 0 ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400">No formulas for this lesson.</Text>
            ) : (
              lesson.formulaSheet.map((formula) => (
                <View key={formula} className="mb-2 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800">
                  <Text className="font-mono text-sm text-gray-800 dark:text-gray-200">{formula}</Text>
                </View>
              ))
            ))}

          {activeTab === 'Visuals' && (
            <View>
              {lesson.imageSuggestions?.length ? (
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-bold text-gray-900 dark:text-white">බලන්න ඕන පින්තූර</Text>
                  {lesson.imageSuggestions.map((suggestion) => (
                    <View
                      key={suggestion.image}
                      className="mb-3 rounded-2xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/60"
                    >
                      <View className="mb-2 flex-row items-start">
                        <Ionicons name="image-outline" size={16} color={palette.primary[600]} />
                        <Text className="ml-2 flex-1 text-sm leading-5 text-gray-800 dark:text-gray-200">
                          {suggestion.image}
                        </Text>
                      </View>
                      <Text className="text-xs leading-5 text-gray-600 dark:text-gray-400">
                        <Text className="font-semibold">පැහැදිලි කරන්නේ: </Text>
                        {suggestion.usedToExplain}
                      </Text>
                      <Text className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">
                        <Text className="font-semibold">ඇයි උපකාරී වන්නේ: </Text>
                        {suggestion.reason}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {lesson.videoSuggestions?.length ? (
                <View>
                  <Text className="mb-2 text-sm font-bold text-gray-900 dark:text-white">බලන්න ඕන වීඩියෝ</Text>
                  {lesson.videoSuggestions.map((suggestion) => (
                    <View
                      key={suggestion.search}
                      className="mb-3 rounded-2xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/60"
                    >
                      <View className="mb-2 flex-row items-start">
                        <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                        <Text className="ml-2 flex-1 font-mono text-sm text-gray-800 dark:text-gray-200">
                          {suggestion.search}
                        </Text>
                      </View>
                      <Text className="text-xs leading-5 text-gray-600 dark:text-gray-400">
                        <Text className="font-semibold">බලන්න: </Text>
                        {suggestion.observe}
                      </Text>
                      <Text className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">
                        <Text className="font-semibold">ඉගෙන ගන්නවා: </Text>
                        {suggestion.learn}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          {activeTab === 'Memory Tricks' &&
            (lesson.memoryTricks?.length ? (
              lesson.memoryTricks.map((trick) => (
                <View
                  key={trick}
                  className="mb-2 flex-row items-start rounded-xl bg-purple-50 px-3 py-2.5 dark:bg-purple-900/25"
                >
                  <Ionicons name="bulb-outline" size={16} color={palette.accent[600]} />
                  <Text className="ml-2 flex-1 text-sm leading-5 text-gray-800 dark:text-gray-200">{trick}</Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-gray-500 dark:text-gray-400">No memory tricks for this lesson.</Text>
            ))}

          {activeTab === 'Exam Tips' && (
            <View>
              {lesson.commonMistakes?.length ? (
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-bold text-gray-900 dark:text-white">සිසුන් නිතර කරන වැරදි</Text>
                  {lesson.commonMistakes.map((mistake) => (
                    <View
                      key={mistake}
                      className="mb-2 flex-row items-start rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-900/25"
                    >
                      <Ionicons name="close-circle-outline" size={16} color={palette.danger} />
                      <Text className="ml-2 flex-1 text-sm leading-5 text-gray-800 dark:text-gray-200">{mistake}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {lesson.examTips?.length ? (
                <View>
                  <Text className="mb-2 text-sm font-bold text-gray-900 dark:text-white">විභාග උපදෙස්</Text>
                  {lesson.examTips.map((tip) => (
                    <View
                      key={tip}
                      className="mb-2 flex-row items-start rounded-xl bg-blue-50 px-3 py-2.5 dark:bg-blue-900/25"
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={palette.primary[600]} />
                      <Text className="ml-2 flex-1 text-sm leading-5 text-gray-800 dark:text-gray-200">{tip}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          {activeTab === 'Practice' &&
            (lesson.practiceItems?.length ? (
              lesson.practiceItems.map((item, index) => (
                <View
                  key={`${item.kind}-${index}`}
                  className="mb-4 rounded-2xl border border-gray-100 p-3.5 dark:border-gray-800"
                >
                  <View className="mb-2 flex-row items-center justify-between">
                    <Badge label={item.kind} tone="neutral" />
                    <Text className="text-xs text-gray-400">#{index + 1}</Text>
                  </View>

                  <Text className="mb-2 text-sm leading-5 text-gray-800 dark:text-gray-200">{item.question}</Text>

                  {item.options?.length ? (
                    <View className="mb-2">
                      {item.options.map((option, optionIndex) => (
                        <View key={option} className="mb-1.5 flex-row items-start">
                          <Text className="mr-2 text-sm font-semibold text-primary-600">
                            {String.fromCharCode(65 + optionIndex)}.
                          </Text>
                          <Text className="flex-1 text-sm leading-5 text-gray-700 dark:text-gray-300">{option}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {revealedAnswers[index] ? (
                    <View className="mt-1 rounded-xl bg-green-50 p-3 dark:bg-green-900/25">
                      <Text className="text-sm font-bold text-green-800 dark:text-green-300">පිළිතුර</Text>
                      <Text className="mt-1 text-sm leading-5 text-gray-800 dark:text-gray-200">{item.answer}</Text>
                      <Text className="mt-2 text-sm font-bold text-green-800 dark:text-green-300">පැහැදිලි කිරීම</Text>
                      <Text className="mt-1 text-sm leading-5 text-gray-700 dark:text-gray-300">
                        {item.explanation}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setRevealedAnswers((prev) => ({ ...prev, [index]: true }))}
                      className="mt-1 flex-row items-center justify-center rounded-xl bg-primary-50 py-2.5 dark:bg-primary-900/40"
                    >
                      <Ionicons name="eye-outline" size={16} color={palette.primary[600]} />
                      <Text className="ml-2 text-sm font-semibold text-primary-700 dark:text-primary-200">
                        පිළිතුර බලන්න
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))
            ) : (
              <Text className="text-sm text-gray-500 dark:text-gray-400">No practice questions yet.</Text>
            ))}

          {activeTab === 'Summary' && (
            <Text className="text-base leading-6 text-gray-700 dark:text-gray-300">{lesson.summary}</Text>
          )}

          {activeTab === 'Related Questions' &&
            (relatedQuestions.length === 0 ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400">No related questions yet.</Text>
            ) : (
              relatedQuestions.map((question) => (
                <View key={question.id} className="mb-3 border-b border-gray-100 pb-3 dark:border-gray-800">
                  <Badge label={question.type} tone="neutral" />
                  <Text className="mt-1.5 text-sm text-gray-800 dark:text-gray-200">{question.prompt}</Text>
                </View>
              ))
            ))}

          <Pressable
            onPress={() => markChapterCompleted(chapter.id)}
            className="mt-5 flex-row items-center justify-center rounded-2xl bg-green-50 py-3 dark:bg-green-900/30"
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={palette.success} />
            <Text className="ml-2 text-sm font-semibold text-green-700 dark:text-green-300">
              Mark Chapter as Complete
            </Text>
          </Pressable>
        </Card>

        {/* Move between topics without going back to the list. */}
        <View className="mt-4 flex-row gap-3">
          {previousLesson ? (
            <Pressable
              onPress={() => router.replace(`/theory/${chapter.id}/${previousLesson.id}`)}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-gray-100 py-3 dark:bg-gray-800"
            >
              <Ionicons name="arrow-back" size={16} color={palette.gray[500]} />
              <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Previous</Text>
            </Pressable>
          ) : null}

          {nextLesson ? (
            <Pressable
              onPress={() => router.replace(`/theory/${chapter.id}/${nextLesson.id}`)}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-primary-600 py-3"
            >
              <Text className="mr-2 text-sm font-semibold text-white">Next Topic</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
