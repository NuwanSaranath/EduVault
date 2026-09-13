import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AnswerSheetGrid,
  Button,
  EmptyState,
  LoadingSpinner,
  ProgressBar,
  ScreenContainer,
} from '@/components';
import { palette } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useCountdown } from '@/hooks/useCountdown';
import { fetchChapter } from '@/services/theory';
import { fetchPastPaper, fetchPastPaperQuestions, gradePastPaper } from '@/services/pastPapers';
import { useExamStore } from '@/store/examStore';
import { useProgressStore } from '@/store/progressStore';
import { formatDuration } from '@/utils/format';

/** Option letter for a position in the options array: 0 → 'A'. */
function letterFor(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Timed past-paper attempt.
 *
 * Reads the paper and its questions from SQLite, so a student can sit a paper
 * with no connection at all. Marking is local too — the result appears the
 * instant they submit, and the graded record goes out through the outbox.
 *
 * The answer sheet is the custom `AnswerSheetGrid`, kept in sync with the
 * scrolling question list in both directions: tapping a bubble answers the
 * question, and tapping a row number scrolls the list to it.
 */
export function PastPaperExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: paper, loading: paperLoading } = useAsyncData(
    () => fetchPastPaper(id),
    [id],
  );
  const { data: questions, loading: questionsLoading } = useAsyncData(
    () => fetchPastPaperQuestions(id),
    [id],
  );

  const mcqQuestions = useMemo(
    () => (questions ?? []).filter((q) => q.type === 'MCQ'),
    [questions],
  );

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [focusedQuestion, setFocusedQuestion] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const scrollRef = useRef<ScrollView>(null);
  const questionOffsets = useRef<Record<number, number>>({});

  const setLastResult = useExamStore((s) => s.setLastResult);
  const setLastSheet = useExamStore((s) => s.setLastSheet);
  const addPastPaperResult = useProgressStore((s) => s.addPastPaperResult);

  const submitExam = async () => {
    if (submitting) return; // the timer and the button can both fire
    setSubmitting(true);

    try {
      const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

      // Chapter titles feed the weak-area breakdown on the result screen. Read
      // once per distinct chapter rather than once per question.
      const chapterIds = [
        ...new Set(mcqQuestions.map((q) => q.chapterId).filter((c): c is string => Boolean(c))),
      ];
      const chapterTitles = new Map<string, string>();
      for (const chapterId of chapterIds) {
        const chapter = await fetchChapter(chapterId);
        if (chapter) chapterTitles.set(chapterId, chapter.title);
      }

      const answerPayload = mcqQuestions.map((q) => ({
        questionId: q.id,
        givenAnswer: answers[q.id] ?? '',
        chapterTitle: q.chapterId ? chapterTitles.get(q.chapterId) : undefined,
      }));

      const result = await gradePastPaper(id, answerPayload, 100, durationSeconds);

      // Snapshot the sheet in letter form so the result screen can replay it.
      const sheetAnswers: Record<number, string> = {};
      const sheetCorrect: Record<number, string> = {};
      mcqQuestions.forEach((question, index) => {
        const options = question.options ?? [];
        const givenIndex = options.indexOf(answers[question.id] ?? '');
        const correctIndex = options.indexOf(question.correctAnswer);
        if (givenIndex >= 0) sheetAnswers[index + 1] = letterFor(givenIndex);
        if (correctIndex >= 0) sheetCorrect[index + 1] = letterFor(correctIndex);
      });

      setLastResult(result);
      setLastSheet({
        questionCount: mcqQuestions.length,
        optionsPerQuestion: Math.max(
          ...mcqQuestions.map((q) => q.options?.length ?? 4),
          4,
        ),
        answers: sheetAnswers,
        correctAnswers: sheetCorrect,
      });
      addPastPaperResult(result);

      router.replace(`/past-papers/${id}/result`);
    } finally {
      setSubmitting(false);
    }
  };

  const { secondsLeft } = useCountdown(
    (paper?.durationMinutes ?? 60) * 60,
    () => void submitExam(),
  );

  if (paperLoading || questionsLoading) {
    return (
      <ScreenContainer>
        <LoadingSpinner />
      </ScreenContainer>
    );
  }

  if (!paper || mcqQuestions.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState icon="alert-circle-outline" title="No MCQ questions available for this paper" />
      </ScreenContainer>
    );
  }

  const confirmSubmit = () => {
    const unanswered = mcqQuestions.filter((q) => !answers[q.id]).length;
    if (unanswered > 0) {
      Alert.alert(
        'Submit paper?',
        `You have ${unanswered} unanswered question(s). Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', style: 'destructive', onPress: () => void submitExam() },
        ],
      );
      return;
    }
    void submitExam();
  };

  /** Grid answers derived from the id-keyed source of truth, never duplicated. */
  const sheetAnswers = mcqQuestions.reduce<Record<number, string>>((acc, question, index) => {
    const options = question.options ?? [];
    const givenIndex = options.indexOf(answers[question.id] ?? '');
    if (givenIndex >= 0) acc[index + 1] = letterFor(givenIndex);
    return acc;
  }, {});

  const optionsPerQuestion = Math.max(
    ...mcqQuestions.map((q) => q.options?.length ?? 4),
    4,
  );

  return (
    <ScreenContainer edges={['top', 'bottom']} className="px-5 pt-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">{paper.title}</Text>
        <View className="flex-row items-center rounded-full bg-primary-50 px-3 py-1.5 dark:bg-primary-900/40">
          <Ionicons name="time-outline" size={14} color={palette.primary[600]} />
          <Text className="ml-1 text-xs font-bold text-primary-700 dark:text-primary-200">
            {formatDuration(secondsLeft)}
          </Text>
        </View>
      </View>

      <ProgressBar
        percent={(Object.keys(answers).length / mcqQuestions.length) * 100}
        height={6}
      />

      <ScrollView ref={scrollRef} className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <AnswerSheetGrid
            questionCount={mcqQuestions.length}
            optionsPerQuestion={optionsPerQuestion}
            answers={sheetAnswers}
            mode="answering"
            focusedQuestion={focusedQuestion}
            onAnswerChange={(questionNo, option) => {
              const question = mcqQuestions[questionNo - 1];
              const optionIndex = option.charCodeAt(0) - 65;
              const value = question?.options?.[optionIndex];
              if (!question || value === undefined) return;
              setAnswers((a) => ({ ...a, [question.id]: value }));
              setFocusedQuestion(questionNo);
            }}
            onQuestionFocus={(questionNo) => {
              setFocusedQuestion(questionNo);
              const offset = questionOffsets.current[questionNo];
              if (offset !== undefined) {
                scrollRef.current?.scrollTo({ y: offset, animated: true });
              }
            }}
          />
        </View>

        {mcqQuestions.map((question, index) => (
          <View
            key={question.id}
            className="mb-6"
            onLayout={(event) => {
              questionOffsets.current[index + 1] = event.nativeEvent.layout.y;
            }}
          >
            <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
              {index + 1}. {question.prompt}
            </Text>
            {question.options?.map((option, optionIndex) => (
              <Pressable
                key={option}
                onPress={() => {
                  setAnswers((a) => ({ ...a, [question.id]: option }));
                  setFocusedQuestion(index + 1);
                }}
                className={`mb-2 flex-row items-center rounded-2xl border-2 px-4 py-3 ${
                  answers[question.id] === option
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <Text className="mr-3 text-xs font-bold text-gray-400">
                  {letterFor(optionIndex)}
                </Text>
                <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200">{option}</Text>
              </Pressable>
            ))}
          </View>
        ))}

        <Button
          label={submitting ? 'Submitting…' : 'Submit Paper'}
          onPress={confirmSubmit}
          disabled={submitting}
        />
        <View className="h-6" />
      </ScrollView>
    </ScreenContainer>
  );
}
