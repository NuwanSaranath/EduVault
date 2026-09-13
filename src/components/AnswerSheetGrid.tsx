import { useMemo } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { palette } from '@/constants/theme';

export type AnswerSheetMode = 'answering' | 'review';

export interface AnswerSheetGridProps {
  /** Number of questions on the paper. */
  questionCount: number;
  /** Options per question, labelled A.. upward. @default 5 */
  optionsPerQuestion?: number;
  /** Current answers, keyed by 1-based question number. */
  answers: Record<number, string>;
  /**
   * 'answering' allows changes; 'review' locks the sheet and colours each bubble
   * against `correctAnswers`. @default 'answering'
   */
  mode?: AnswerSheetMode;
  /** Required in review mode to colour right/wrong. */
  correctAnswers?: Record<number, string>;
  /** Columns of question rows. Omit to fit automatically to the screen width. */
  columns?: number;
  /** Highlighted question, e.g. the one the reader is scrolled to. */
  focusedQuestion?: number;
  /** Fired when a bubble is filled. Not fired in review mode. */
  onAnswerChange: (questionNo: number, option: string) => void;
  /** Fired when a question's row is tapped outside its bubbles. */
  onQuestionFocus?: (questionNo: number) => void;
}

/**
 * Custom component: an OMR-style answer sheet.
 *
 * Modelled on the physical MCQ sheet a Sri Lankan A/L candidate actually fills
 * in. That is the point of building it rather than using a list of radio groups:
 * the student practises on the same spatial layout they will meet in the exam
 * hall, so scanning "which ones have I left blank" is the same motion on paper
 * and on screen. A stack of standard form controls trains the wrong habit.
 *
 * It is also where the constrained-layout work is visible. The grid has no fixed
 * dimensions — `columns` is derived from the measured window width against a
 * minimum legible row width, and bubble diameter is derived from the resulting
 * column width. The same component gives 1 column on a small phone and 3 on a
 * tablet without a single breakpoint or media query.
 */
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

  /**
   * Constraint solve: the narrowest row that stays tappable, then as many
   * columns as fit. 44px is the platform minimum touch target, so the row needs
   * the question number plus one 44px-ish target per option.
   */
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

    // Spend leftover width on bigger bubbles rather than dead space, capped so a
    // tablet does not render comically large circles.
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

  /** Column-major fill, so question 1..n reads top-to-bottom then across —
   *  the way a printed answer sheet is laid out. */
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
                          // Review mode locks the sheet: a graded paper that can
                          // still be edited invites accidental tampering.
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

/**
 * Resolves one bubble's colours.
 *
 * Review mode shows three distinct states rather than two: the answer given, the
 * answer that was correct, and — when those differ — both at once. Marking only
 * "wrong" tells a student they failed without telling them what to learn.
 */
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
