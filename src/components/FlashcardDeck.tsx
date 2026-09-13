import { useCallback, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/constants/theme';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  /** Optional topic id, passed straight back through `onGrade`. */
  topicId?: string;
}

export type CardGrade = 'known' | 'review';

export interface FlashcardDeckProps {
  cards: Flashcard[];
  /**
   * Horizontal distance in px past which a release commits the swipe. Below
   * this the card springs back. @default 110
   */
  swipeThreshold?: number;
  /**
   * Release velocity (px/s) that commits a swipe regardless of distance, so a
   * quick flick works without dragging the full width. @default 800
   */
  velocityThreshold?: number;
  /** Cards visible behind the active one. @default 2 */
  stackDepth?: number;
  /** Fired on every committed swipe. Right → known, left → review. */
  onGrade: (cardId: string, grade: CardGrade, topicId?: string) => void;
  /** Fired when the last card leaves the deck. */
  onDeckEmpty?: (summary: { known: number; review: number }) => void;
  /** Fired each time a card is tapped to flip. */
  onFlip?: (cardId: string, face: 'front' | 'back') => void;
}

/**
 * Custom component: a swipeable, flippable flashcard deck.
 *
 * Written rather than pulled from a library because the gesture *is* the
 * pedagogy. Self-grading by swipe direction is what feeds the adaptive
 * algorithm — `onGrade` carries the topic id straight into the same weakness
 * signal quiz answers produce, so five minutes of flashcards measurably changes
 * what the next quiz asks. A generic carousel would give no grade at all.
 *
 * Mechanics
 *  - A pan gesture drives `translateX` on the UI thread via Reanimated, so
 *    dragging stays at 60fps even while the JS thread is mid-database-write.
 *  - Rotation is interpolated from x-offset, which is what makes the card feel
 *    hinged at the wrist rather than sliding on glass.
 *  - Commit is distance OR velocity: a deliberate drag and a fast flick are both
 *    valid intents, and requiring distance alone makes quick review tedious.
 *  - `runOnJS` marshals the commit back to JS, because `onGrade` touches SQLite
 *    and cannot run in a worklet.
 *  - A tap flips the card. Gesture.Exclusive keeps a flip from firing at the end
 *    of a drag, which is the bug that makes hand-rolled card stacks feel broken.
 */
export function FlashcardDeck({
  cards,
  swipeThreshold = 110,
  velocityThreshold = 800,
  stackDepth = 2,
  onGrade,
  onDeckEmpty,
  onFlip,
}: FlashcardDeckProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ known: 0, review: 0 });

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const flipProgress = useSharedValue(0);

  const active = cards[index];

  /**
   * Advances the deck after a committed swipe.
   *
   * Resets shared values *before* the index changes so the incoming card is
   * never painted at the outgoing card's offset for a frame.
   */
  const commit = useCallback(
    (grade: CardGrade) => {
      const card = cards[index];
      if (!card) return;

      onGrade(card.id, grade, card.topicId);

      const nextTally = {
        known: tally.known + (grade === 'known' ? 1 : 0),
        review: tally.review + (grade === 'review' ? 1 : 0),
      };
      setTally(nextTally);

      translateX.value = 0;
      translateY.value = 0;
      flipProgress.value = 0;
      setFlipped(false);

      const nextIndex = index + 1;
      setIndex(nextIndex);

      if (nextIndex >= cards.length) {
        onDeckEmpty?.(nextTally);
      }
    },
    [cards, index, onGrade, onDeckEmpty, tally, translateX, translateY, flipProgress],
  );

  const flip = useCallback(() => {
    const card = cards[index];
    if (!card) return;
    const nextFace = flipped ? 'front' : 'back';
    flipProgress.value = withTiming(flipped ? 0 : 1, { duration: 260 });
    setFlipped(!flipped);
    onFlip?.(card.id, nextFace);
  }, [cards, index, flipped, flipProgress, onFlip]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      // Damped vertical follow: full tracking makes the card feel unmoored.
      translateY.value = event.translationY * 0.25;
    })
    .onEnd((event) => {
      const passedDistance = Math.abs(translateX.value) > swipeThreshold;
      const passedVelocity = Math.abs(event.velocityX) > velocityThreshold;

      if (passedDistance || passedVelocity) {
        const grade: CardGrade = translateX.value > 0 ? 'known' : 'review';
        // Fling the card clear of the screen, then hand off to JS. Using width
        // rather than a fixed number keeps the exit off-screen on any device.
        translateX.value = withTiming(
          Math.sign(translateX.value || event.velocityX) * width * 1.4,
          { duration: 180 },
          (finished) => {
            if (finished) runOnJS(commit)(grade);
          },
        );
        return;
      }

      translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const tapGesture = Gesture.Tap().maxDistance(10).onEnd(() => {
    runOnJS(flip)();
  });

  // Exclusive, pan first: a tap only registers when the finger barely moved, so
  // ending a drag cannot also flip the card.
  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${interpolate(translateX.value, [-width, 0, width], [-14, 0, 14])}deg` },
    ],
  }));

  /** Green on a right drag, amber on a left drag — feedback before release. */
  const overlayStyle = useAnimatedStyle(() => {
    const strength = Math.min(1, Math.abs(translateX.value) / swipeThreshold);
    return {
      opacity: strength * 0.9,
      backgroundColor: translateX.value > 0 ? palette.success : palette.warning,
    };
  });

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.5, 1], [1, 0, 0]),
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.5, 1], [0, 0, 1]),
  }));

  if (!active) {
    return (
      <View className="items-center justify-center rounded-2xl bg-card-light p-8 dark:bg-card-dark">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">
          Deck complete
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {tally.known} known · {tally.review} to review
        </Text>
      </View>
    );
  }

  return (
    <View className="items-center">
      <View style={{ height: 260, width: '100%' }} className="items-center justify-center">
        {/* Cards behind the active one, drawn back-to-front and inset so the
            stack reads as depth without a shadow library. */}
        {cards
          .slice(index + 1, index + 1 + stackDepth)
          .reverse()
          .map((card, i, arr) => {
            const depth = arr.length - i;
            return (
              <View
                key={card.id}
                className="absolute rounded-2xl bg-card-light dark:bg-card-dark"
                style={{
                  width: `${92 - depth * 4}%`,
                  height: 220,
                  top: depth * 10,
                  opacity: 1 - depth * 0.25,
                }}
              />
            );
          })}

        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[{ width: '92%', height: 220 }, cardStyle]}
            className="absolute overflow-hidden rounded-2xl bg-card-light shadow-sm shadow-black/10 dark:bg-card-dark"
            accessibilityRole="button"
            accessibilityLabel={flipped ? active.back : active.front}
            accessibilityHint="Tap to flip. Swipe right if you knew it, left to review again."
          >
            <Animated.View
              pointerEvents="none"
              style={overlayStyle}
              className="absolute inset-0 z-10"
            />

            <View className="flex-1 items-center justify-center p-6">
              <Animated.View style={frontStyle} className="absolute items-center px-6">
                <Text className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                  {active.front}
                </Text>
                <Text className="mt-3 text-xs text-gray-400">tap to reveal</Text>
              </Animated.View>

              <Animated.View style={backStyle} className="absolute items-center px-6">
                <Text className="text-center text-base text-gray-800 dark:text-gray-100">
                  {active.back}
                </Text>
              </Animated.View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View className="mt-4 w-full flex-row items-center justify-between px-6">
        <Text className="text-xs font-medium" style={{ color: palette.warning }}>
          ← Review again
        </Text>
        <Text className="text-xs text-gray-400">
          {index + 1} / {cards.length}
        </Text>
        <Text className="text-xs font-medium" style={{ color: palette.success }}>
          I knew it →
        </Text>
      </View>
    </View>
  );
}
