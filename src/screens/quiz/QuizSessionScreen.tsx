import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ProgressBar, ScreenContainer } from '@/components';
import { palette } from '@/constants/theme';
import { isAnswerCorrect, scoreAnswers } from '@/features/quiz/engine';
import { xpForQuizAnswers } from '@/features/gamification/xp';
import { useCountdown } from '@/hooks/useCountdown';
import { useProgressStore } from '@/store/progressStore';
import { useQuizStore } from '@/store/quizStore';
import type { Question } from '@/types';

const QUESTION_SECONDS = 30;

function QuestionCard({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [shortAnswer, setShortAnswer] = useState('');
  const scale = useSharedValue(1);

  const { secondsLeft } = useCountdown(QUESTION_SECONDS, () => {
    if (!submitted) submit(selected ?? shortAnswer ?? '');
  });

  const feedbackStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const submit = (answer: string) => {
    if (submitted) return;
    setSubmitted(true);
    scale.value = withSpring(1.02, {}, () => {
      scale.value = withSpring(1);
    });
    setTimeout(() => onAnswered(answer), 900);
  };

  const isCorrectAnswer = (option: string) => isAnswerCorrect(question, option);

  return (
    <Animated.View style={feedbackStyle} className="flex-1">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
          <Ionicons name="time-outline" size={14} color={palette.gray[500]} />
          <Text className="ml-1 text-xs font-semibold text-gray-600 dark:text-gray-300">{secondsLeft}s</Text>
        </View>
        <Text className="text-xs font-semibold text-gray-400">{question.difficulty}</Text>
      </View>

      <Text className="mb-6 text-xl font-bold leading-7 text-gray-900 dark:text-white">{question.prompt}</Text>

      {question.type === 'MCQ' &&
        question.options?.map((option) => {
          const showCorrect = submitted && isCorrectAnswer(option);
          const showWrong = submitted && selected === option && !isCorrectAnswer(option);
          return (
            <Pressable
              key={option}
              disabled={submitted}
              onPress={() => {
                setSelected(option);
                submit(option);
              }}
              className={`mb-3 rounded-2xl border-2 px-4 py-3.5 ${
                showCorrect
                  ? 'border-success bg-green-50 dark:bg-green-900/30'
                  : showWrong
                    ? 'border-danger bg-red-50 dark:bg-red-900/30'
                    : selected === option
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <Text className="text-base text-gray-800 dark:text-gray-200">{option}</Text>
            </Pressable>
          );
        })}

      {question.type === 'True/False' &&
        ['True', 'False'].map((option) => {
          const showCorrect = submitted && isCorrectAnswer(option);
          const showWrong = submitted && selected === option && !isCorrectAnswer(option);
          return (
            <Pressable
              key={option}
              disabled={submitted}
              onPress={() => {
                setSelected(option);
                submit(option);
              }}
              className={`mb-3 rounded-2xl border-2 px-4 py-4 ${
                showCorrect
                  ? 'border-success bg-green-50 dark:bg-green-900/30'
                  : showWrong
                    ? 'border-danger bg-red-50 dark:bg-red-900/30'
                    : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <Text className="text-center text-base font-semibold text-gray-800 dark:text-gray-200">{option}</Text>
            </Pressable>
          );
        })}

      {question.type === 'Short Answer' && (
        <View>
          <TextInput
            editable={!submitted}
            value={shortAnswer}
            onChangeText={setShortAnswer}
            placeholder="Type your answer..."
            placeholderTextColor={palette.gray[400]}
            className="mb-3 rounded-2xl border-2 border-gray-200 px-4 py-3.5 text-base text-gray-900 dark:border-gray-700 dark:text-white"
          />
          {!submitted ? (
            <Pressable
              onPress={() => submit(shortAnswer)}
              className="items-center rounded-2xl bg-primary-600 py-3.5"
            >
              <Text className="font-semibold text-white">Submit Answer</Text>
            </Pressable>
          ) : (
            <View
              className={`rounded-2xl px-4 py-3 ${
                isCorrectAnswer(shortAnswer) ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'
              }`}
            >
              <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Correct answer: {question.correctAnswer}
              </Text>
            </View>
          )}
        </View>
      )}

      {submitted ? (
        <View className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
          <Text className="text-sm leading-5 text-gray-600 dark:text-gray-300">{question.explanation}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

export function QuizSessionScreen() {
  const { questions, currentIndex, answers, nextQuestion, answerCurrent, isDailyChallenge, subjectId, startedAt, finishSession, resetSession } =
    useQuizStore();
  const addQuizAttempt = useProgressStore((s) => s.addQuizAttempt);
  const question = questions[currentIndex];

  if (!question) {
    router.replace('/(tabs)/practice');
    return null;
  }

  const handleAnswered = (answer: string) => {
    answerCurrent(answer);
    const isLast = currentIndex === questions.length - 1;

    if (!isLast) {
      nextQuestion();
      return;
    }

    const finalAnswers = { ...answers, [question.id]: answer };
    const { attemptAnswers, correctCount } = scoreAnswers(questions, finalAnswers);
    const durationSeconds = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;
    const xpEarned = xpForQuizAnswers(correctCount, isDailyChallenge);

    addQuizAttempt({
      id: `attempt-${Date.now()}`,
      subjectId: subjectId ?? question.subjectId,
      quizType: 'Mixed',
      answers: attemptAnswers,
      score: correctCount,
      totalQuestions: questions.length,
      xpEarned,
      takenAt: new Date().toISOString(),
      durationSeconds,
    });

    finishSession({ correctCount, totalQuestions: questions.length, xpEarned, durationSeconds });
    router.replace('/quiz/result');
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <View className="mb-5">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <Pressable onPress={() => { resetSession(); router.back(); }}>
            <Ionicons name="close" size={20} color={palette.gray[400]} />
          </Pressable>
        </View>
        <ProgressBar percent={((currentIndex + 1) / questions.length) * 100} height={6} />
      </View>

      <QuestionCard key={question.id} question={question} onAnswered={handleAnswered} />
    </ScreenContainer>
  );
}
