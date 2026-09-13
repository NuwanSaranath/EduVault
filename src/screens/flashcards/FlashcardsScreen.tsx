import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  FlashcardDeck,
  GradientHeader,
  LoadingSpinner,
  ScreenContainer,
  type CardGrade,
} from '@/components';
import { palette } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useStreamSubjects } from '@/hooks/useStreamSubjects';
import { buildDeck, gradesToAttempt, type DeckGrade } from '@/features/flashcards/build';
import { getQuestionsBySubject } from '@/db/repositories/contentRepo';
import { getRecentAttempts } from '@/db/repositories/attemptRepo';
import { useProgressStore } from '@/store/progressStore';

const DECK_SIZE = 12;

/**
 * Rapid revision with the custom flashcard deck.
 *
 * Entirely offline: the deck is built from cached questions and the student's
 * local attempt history, and the resulting grades are written straight into
 * SQLite and the outbox. Nothing on this screen waits on a network call.
 */
export function FlashcardsScreen() {
  const { subjects, loading: subjectsLoading } = useStreamSubjects();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [summary, setSummary] = useState<{ known: number; review: number } | null>(null);

  const addQuizAttempt = useProgressStore((s) => s.addQuizAttempt);

  // Grades accumulate in a ref, not state: every swipe would otherwise re-render
  // the deck mid-animation and reset the card that is still flying off-screen.
  const grades = useRef<DeckGrade[]>([]);
  const startedAt = useRef(Date.now());

  const activeSubjectId = subjectId ?? subjects[0]?.id ?? null;

  const { data: deckData, loading } = useAsyncData(async () => {
    if (!activeSubjectId) return null;
    const [pool, attempts] = await Promise.all([
      getQuestionsBySubject(activeSubjectId),
      getRecentAttempts(),
    ]);
    return { pool, cards: buildDeck(pool, attempts, DECK_SIZE) };
  }, [activeSubjectId, sessionKey]);

  const handleGrade = useCallback((cardId: string, grade: CardGrade) => {
    grades.current.push({ cardId, grade });
  }, []);

  const handleDeckEmpty = useCallback(
    (tally: { known: number; review: number }) => {
      setSummary(tally);

      const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000);
      const attempt = gradesToAttempt(grades.current, deckData?.pool ?? [], durationSeconds);

      // Goes through the same store action a quiz uses, so the attempt lands in
      // SQLite and the outbox with no flashcard-specific sync path.
      if (attempt) addQuizAttempt(attempt);
    },
    [addQuizAttempt, deckData?.pool],
  );

  const restart = () => {
    grades.current = [];
    startedAt.current = Date.now();
    setSummary(null);
    setSessionKey((k) => k + 1);
  };

  if (subjectsLoading) {
    return (
      <ScreenContainer>
        <LoadingSpinner />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-extrabold text-white">Flashcards</Text>
            <Text className="mt-1 text-sm text-white/80">
              Swipe right if you knew it, left to see it again sooner
            </Text>
          </View>
          <Pressable onPress={() => router.back()} className="p-2 active:opacity-70">
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
      </GradientHeader>

      <View className="px-5 pt-5">
        <View className="mb-5 flex-row flex-wrap">
          {subjects.map((subject) => (
            <FilterChip
              key={subject.id}
              label={subject.name}
              active={activeSubjectId === subject.id}
              onPress={() => {
                setSubjectId(subject.id);
                restart();
              }}
            />
          ))}
        </View>

        {loading ? (
          <LoadingSpinner />
        ) : !deckData || deckData.cards.length === 0 ? (
          <EmptyState
            icon="albums-outline"
            title="No cards for this subject yet"
            description="Questions sync from the server. Pick another subject in the meantime."
          />
        ) : summary ? (
          <Card className="items-center py-8">
            <Ionicons name="checkmark-done-circle" size={44} color={palette.success} />
            <Text className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
              Session complete
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {summary.known} known · {summary.review} to review
            </Text>
            <Text className="mt-3 px-6 text-center text-xs text-gray-400">
              The {summary.review} card{summary.review === 1 ? '' : 's'} you marked for review will
              be weighted higher in your next quiz.
            </Text>
            <View className="mt-5 w-full">
              <Button label="Another deck" onPress={restart} />
            </View>
          </Card>
        ) : (
          <FlashcardDeck
            // Remounts on a new session so the deck's internal index resets.
            key={`${activeSubjectId}-${sessionKey}`}
            cards={deckData.cards}
            onGrade={handleGrade}
            onDeckEmpty={handleDeckEmpty}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
