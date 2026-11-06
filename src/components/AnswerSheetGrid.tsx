import { useMemo } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { palette } from '@/constants/theme';

export type AnswerSheetMode = 'answering' | 'review';

export interface AnswerSheetGridProps {
  // number of questions on the paper
  questionCount: number;
  // options per question (A, B, C...). default 5
  optionsPerQuestion?: number;
  // question number (from 1) -> letter
  answers: Record<number, string>;
  // 'answering' can change answers, 'review' locks it and colours right/wrong. default 'answering'
  mode?: AnswerSheetMode;
  // needed in review mode
  correctAnswers?: Record<number, string>;
  // leave it out to fit the screen width
  columns?: number;
  // question to highlight
  focusedQuestion?: number;
  // when a bubble is filled (not in review mode)
  onAnswerChange: (questionNo: number, option: string) => void;
  // when a row is tapped but not on a bubble
  onQuestionFocus?: (questionNo: number) => void;
}

// Answer sheet that looks like the real A/L MCQ (OMR) sheet, so students
// practise on the same layout they'll use in the exam hall instead of a list
// of radio buttons.
// No fixed sizes: columns are worked out from the screen width and the bubble
// size from the column width. 1 column on a small phone, 3 on a tablet, no
// breakpoints needed.
export function AnswerSheetGrid({
  questionCount,
  optionsPerQuestion = 5,
  answers,
  mode = 'answering',
  correctAnswers,
  columns,
  focusedQuestion,
  onAnswerChange,
  onQuestionFocus,
}: AnswerSheetGridProps) {
  const { width } = useWindowDimensions();

  // smallest row that's still easy to tap (44px per option + the number),
  // then fit as many columns as we can
  const layout = useMemo(() => {
    const MIN_BUBBLE = 26;
    const NUMBER_GUTTER = 34;
    const HORIZONTAL_PADDING = 32;
    const COLUMN_GAP = 12;

    const minRowWidth = NUMBER_GUTTER + optionsPerQuestion * (MIN_BUBBLE + 6);
    const available = width - HORIZONTAL_PADDING;

    const fitColumns = Math.max(1, Math.floor((available + COLUMN_GAP) / (minRowWidth + COLUMN_GAP)));
    const resolvedColumns = Math.max(1, columns ?? Math.min(fitColumns, 3));

    const columnWidth =
      (available - COLUMN_GAP * (resolvedColumns - 1)) / resolvedColumns;

    // use spare width for bigger bubbles, but cap it so tablets don't get huge ones
    const bubbleSize = Math.min(
      38,
      Math.max(MIN_BUBBLE, Math.floor((columnWidth - NUMBER_GUTTER) / optionsPerQuestion) - 6),
    );

    return { columns: resolvedColumns, columnWidth, bubbleSize, columnGap: COLUMN_GAP };
  }, [width, columns, optionsPerQuestion]);

  const optionLabels = useMemo(
    () => Array.from({ length: optionsPerQuestion }, (_, i) => String.fromCharCode(65 + i)),
    [optionsPerQuestion],
  );

  // fill down then across, like the printed sheet
  const columnsOfQuestions = useMemo(() => {
    const perColumn = Math.ceil(questionCount / layout.columns);
    return Array.from({ length: layout.columns }, (_, c) =>
      Array.from({ length: perColumn }, (_, r) => c * perColumn + r + 1).filter(
        (n) => n <= questionCount,
      ),
    );
  }, [questionCount, layout.columns]);

  const isReview = mode === 'review';
  const answeredCount = Object.keys(answers).length;

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Answer sheet
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {answeredCount}/{questionCount} filled
        </Text>
      </View>

      <View className="flex-row" style={{ gap: layout.columnGap }}>
        {columnsOfQuestions.map((questionNumbers, columnIndex) => (
          <View key={columnIndex} style={{ width: layout.columnWidth }}>
            {questionNumbers.map((questionNo) => {
              const given = answers[questionNo];
              const correct = correctAnswers?.[questionNo];
              const focused = focusedQuestion === questionNo;

              return (
                <Pressable
                  key={questionNo}
                  onPress={() => onQuestionFocus?.(questionNo)}
                  className="mb-1 flex-row items-center rounded-lg px-1 py-0.5"
                  style={focused ? { backgroundColor: palette.primary[50] } : undefined}
                >
                  <Text
                    className="w-8 text-[11px] font-semibold text-gray-500 dark:text-gray-400"
                    style={focused ? { color: palette.primary[700] } : undefined}
                  >
                    {questionNo}
                  </Text>

                  <View className="flex-1 flex-row items-center justify-between">
                    {optionLabels.map((option) => {
                      const selected = given === option;
                      const style = bubbleStyle({
                        selected,
                        isReview,
                        isCorrectOption: correct === option,
                        wasWrong: isReview && selected && correct !== undefined && correct !== option,
                      });

                      return (
                        <Pressable
                          key={option}
                          // can't change answers after marking
                          disabled={isReview}
                          onPress={() => onAnswerChange(questionNo, option)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected, disabled: isReview }}
                          accessibilityLabel={`Question ${questionNo}, option ${option}`}
                          style={{
                            width: layout.bubbleSize,
                            height: layout.bubbleSize,
                            borderRadius: layout.bubbleSize / 2,
                            borderWidth: style.borderWidth,
                            borderColor: style.borderColor,
                            backgroundColor: style.background,
                          }}
                          className="items-center justify-center active:opacity-70"
                        >
                          <Text
                            style={{
                              color: style.textColor,
                              fontSize: Math.max(10, layout.bubbleSize * 0.4),
                            }}
                            className="font-semibold"
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

interface BubbleState {
  selected: boolean;
  isReview: boolean;
  isCorrectOption: boolean;
  wasWrong: boolean;
}

// bubble colours. review mode shows what they picked, what was right, and
// both if different, so they can see the correct answer not just "wrong"
function bubbleStyle(state: BubbleState): {
  borderColor: string;
  borderWidth: number;
  background: string;
  textColor: string;
} {
  if (state.isReview) {
    if (state.wasWrong) {
      return {
        borderColor: palette.danger,
        borderWidth: 2,
        background: palette.danger,
        textColor: '#FFFFFF',
      };
    }
    if (state.isCorrectOption) {
      return {
        borderColor: palette.success,
        borderWidth: 2,
        background: state.selected ? palette.success : 'transparent',
        textColor: state.selected ? '#FFFFFF' : palette.success,
      };
    }
    return {
      borderColor: palette.gray[300],
      borderWidth: 1,
      background: 'transparent',
      textColor: palette.gray[400],
    };
  }

  if (state.selected) {
    return {
      borderColor: palette.primary[600],
      borderWidth: 2,
      background: palette.primary[600],
      textColor: '#FFFFFF',
    };
  }

  return {
    borderColor: palette.gray[300],
    borderWidth: 1,
    background: 'transparent',
    textColor: palette.gray[500],
  };
}
