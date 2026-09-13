import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, FilterChip, GradientHeader, ScreenContainer, SectionHeader } from '@/components';
import { palette } from '@/constants/theme';
import { useStreamSubjects } from '@/hooks/useStreamSubjects';
import { fetchDailyChallenge, fetchLeaderboard, fetchQuizQuestions } from '@/services/quiz';
import { useQuizStore } from '@/store/quizStore';
import type { LeaderboardEntry, QuestionType } from '@/types';

const quizTypes: (QuestionType | 'Mixed')[] = ['Mixed', 'MCQ', 'True/False', 'Short Answer'];

export function QuizHomeScreen() {
  const { subjects } = useStreamSubjects();
  const [subjectId, setSubjectId] = useState('');
  const [quizType, setQuizType] = useState<QuestionType | 'Mixed'>('Mixed');
  const [starting, setStarting] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const startSession = useQuizStore((s) => s.startSession);

  // Subjects arrive asynchronously from SQLite, so the default selection cannot
  // be computed during the first render. Only fill it in while nothing is
  // chosen — re-defaulting would fight the student's own selection.
  useEffect(() => {
    if (!subjectId && subjects.length > 0) setSubjectId(subjects[0].id);
  }, [subjectId, subjects]);

  const startQuiz = async () => {
    if (!subjectId) return;
    setStarting(true);
    try {
      const questions = await fetchQuizQuestions(subjectId, quizType, 10);
      startSession({ subjectId, quizType, questions });
      router.push('/quiz/session');
    } finally {
      setStarting(false);
    }
  };

  const startDailyChallenge = async () => {
    setStarting(true);
    try {
      const questions = await fetchDailyChallenge();
      startSession({ subjectId: questions[0]?.subjectId ?? subjectId, quizType: 'Mixed', questions, isDailyChallenge: true });
      router.push('/quiz/session');
    } finally {
      setStarting(false);
    }
  };

  const openLeaderboard = async () => {
    setLeaderboard(await fetchLeaderboard());
    setLeaderboardOpen(true);
  };

  return (
    <ScreenContainer scroll edges={['bottom']}>
      <GradientHeader>
        <Text className="text-2xl font-extrabold text-white">Practice</Text>
        <Text className="mt-1 text-sm text-white/80">Sharpen your skills with quick quizzes</Text>
      </GradientHeader>

      <View className="px-5 pt-5">
        <Pressable onPress={startDailyChallenge}>
          <Card className="mb-5 flex-row items-center bg-primary-600">
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Ionicons name="flash" size={24} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-white">Daily Challenge</Text>
              <Text className="text-xs text-white/80">5 mixed questions · Bonus XP</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Card>
        </Pressable>

        <SectionHeader title="Choose a Subject" />
        <View className="mb-5 flex-row flex-wrap">
          {subjects.map((subject) => (
            <FilterChip
              key={subject.id}
              label={subject.name}
              active={subjectId === subject.id}
              onPress={() => setSubjectId(subject.id)}
            />
          ))}
        </View>

        <SectionHeader title="Question Type" />
        <View className="mb-6 flex-row flex-wrap">
          {quizTypes.map((type) => (
            <FilterChip key={type} label={type} active={quizType === type} onPress={() => setQuizType(type)} />
          ))}
        </View>

        <Button label="Start Quiz" onPress={startQuiz} loading={starting} icon={<Ionicons name="play" size={16} color="#fff" />} />

        <Pressable onPress={openLeaderboard} className="mt-4 flex-row items-center justify-center py-3">
          <Ionicons name="trophy-outline" size={16} color={palette.primary[600]} />
          <Text className="ml-2 text-sm font-semibold text-primary-600 dark:text-primary-300">View Leaderboard</Text>
        </Pressable>
      </View>

      <Modal visible={leaderboardOpen} animationType="slide" transparent onRequestClose={() => setLeaderboardOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setLeaderboardOpen(false)} />
        <View className="max-h-[70%] rounded-t-3xl bg-card-light p-5 dark:bg-card-dark">
          <Text className="mb-4 text-center text-lg font-bold text-gray-900 dark:text-white">🏆 Leaderboard</Text>
          {/* The one screen with nothing useful to cache: ranking against other
              students is meaningless without a connection, so say so rather than
              showing a stale board. */}
          {leaderboard.length === 0 ? (
            <Text className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              The leaderboard needs a connection. Your XP is saved and will count once you are
              back online.
            </Text>
          ) : null}
          {leaderboard.map((entry) => (
            <View key={entry.userId} className="mb-3 flex-row items-center">
              <Text className="mr-3 w-6 text-sm font-bold text-gray-500 dark:text-gray-400">#{entry.rank}</Text>
              <Avatar name={entry.name} size={36} />
              <Text className="ml-3 flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                {entry.name}
              </Text>
              <Text className="text-sm font-bold text-primary-600 dark:text-primary-300">{entry.xp} XP</Text>
            </View>
          ))}
        </View>
      </Modal>
    </ScreenContainer>
  );
}
