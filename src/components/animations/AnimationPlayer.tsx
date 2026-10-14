import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/theme';
import { sceneColors } from '@/features/animation/colors';
import type { AnimationScene } from '@/features/animation/types';
import {
  clamp,
  nextStageStart,
  previousStageStart,
  stageAt,
  stageIndexAt,
} from '@/features/animation/timing';

export interface AnimationPlayerProps {
  scene: AnimationScene;
  isDark: boolean;
  /** Height of the drawing canvas. @default 260 */
  canvasHeight?: number;
  /**
   * Set false when the animation is off-screen or its tab is hidden. The clock
   * stops entirely rather than rendering frames nobody can see.
   */
  active?: boolean;
}

/**
 * Frame cap in frames per second.
 *
 * Constrained-design decision, not a performance accident. These scenes are
 * teaching diagrams of a few dozen SVG elements; at 30fps the motion is
 * perfectly smooth to the eye while costing roughly half the wake-ups of a
 * 60fps loop on a mid-range Android phone — the device this app targets. The cap
 * is enforced by skipping React updates, so the clock stays accurate even if a
 * frame is late.
 */
const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;

/**
 * Plays one lesson animation.
 *
 * ## Why a JavaScript clock rather than Reanimated
 *
 * Every other animation in this app runs on the UI thread, and should. This one
 * does not, deliberately. A teaching animation has to keep a **Sinhala caption in
 * lockstep with the drawing** — the caption is the teaching, and the drawing is
 * the evidence. Captions are React state, so a UI-thread clock would have to
 * `runOnJS` on every stage boundary anyway, giving up the isolation that makes
 * UI-thread animation worthwhile while adding worklet complexity.
 *
 * Driving `t` from JS instead makes the caption, the highlighted stage chip, the
 * scrubber position and the drawing all derive from a single number in a single
 * render. They cannot drift apart, because there is nothing to drift.
 *
 * The cost is bounded and measured: one `setState` per frame at a capped 30fps,
 * rendering a few dozen SVG nodes. The clock stops completely when paused, when
 * finished, when `active` is false, and when the student has reduce-motion on.
 */
export function AnimationPlayer({
  scene,
  isDark,
  canvasHeight = 260,
  active = true,
}: AnimationPlayerProps) {
  const c = sceneColors(isDark);

  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  // The clock lives in refs: mutating them must not trigger a render, and the
  // rAF callback must read the latest value without being re-created each frame.
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const tRef = useRef(0);

  const setTime = useCallback((next: number) => {
    const clamped = clamp(next, 0, scene.duration);
    tRef.current = clamped;
    setT(clamped);
  }, [scene.duration]);

  // ── Reduce motion ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // ── Reset when the scene changes ─────────────────────────────────────────
  useEffect(() => {
    tRef.current = 0;
    setT(0);
    setPlaying(false);
  }, [scene.id]);

  // ── The clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Reduce motion renders one static final frame and never starts a loop.
    if (!playing || !active || reduceMotion) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastFrameRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const elapsed = now - lastFrameRef.current;

      // Frame cap: advance only when a full frame's worth of time has passed.
      if (elapsed >= FRAME_MS) {
        lastFrameRef.current = now;
        const next = tRef.current + elapsed / 1000;

        if (next >= scene.duration) {
          tRef.current = scene.duration;
          setT(scene.duration);
          setPlaying(false); // stop at the end rather than looping
          return;
        }
        tRef.current = next;
        setT(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing, active, reduceMotion, scene.duration]);

  // Pause when the animation scrolls out of view or its tab is hidden.
  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);

  // ── Controls ─────────────────────────────────────────────────────────────
  const atEnd = t >= scene.duration - 0.01;

  const togglePlay = () => {
    if (reduceMotion) return;
    if (atEnd) {
      setTime(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const replay = () => {
    setTime(0);
    if (!reduceMotion) setPlaying(true);
  };

  const stepBack = () => setTime(previousStageStart(scene.stages, t));
  const stepForward = () => setTime(nextStageStart(scene.stages, t, scene.duration));

  const seekToFraction = useCallback(
    (fraction: number) => {
      setTime(clamp(fraction) * scene.duration);
    },
    [scene.duration, setTime],
  );

  /**
   * Scrubbing.
   *
   * Pauses on touch-down so the clock does not fight the finger, and stays
   * paused on release — a student who scrubs to a moment wants to look at it,
   * not watch it run away.
   */
  const scrub = Gesture.Pan()
    .onBegin((e) => {
      runOnJS(setPlaying)(false);
      if (trackWidth > 0) runOnJS(seekToFraction)(e.x / trackWidth);
    })
    .onUpdate((e) => {
      if (trackWidth > 0) runOnJS(seekToFraction)(e.x / trackWidth);
    });

  const activeStage = stageAt(scene.stages, t);
  const activeIndex = stageIndexAt(scene.stages, t);
  const progress = scene.duration > 0 ? t / scene.duration : 0;

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - width) > 1) setWidth(w);
  };

  const Scene = scene.Component;

  return (
    <View className="mb-6 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View className="flex-row items-center gap-2 px-4 pb-2 pt-3">
        <View
          className="rounded-full px-2 py-0.5"
          style={{
            backgroundColor:
              scene.kind === 'practical' ? palette.accent[600] : palette.primary[600],
          }}
        >
          <Text className="text-[10px] font-bold text-white">
            {scene.kind === 'practical' ? 'පරීක්ෂණය' : 'සංකල්පය'}
          </Text>
        </View>
        <Text className="text-[10px] font-semibold text-gray-400">
          {scene.sectionNumber}
        </Text>
        <Text
          className="flex-1 text-sm font-bold text-gray-900 dark:text-white"
          numberOfLines={1}
        >
          {scene.titleSi}
        </Text>
      </View>

      <Text className="px-4 pb-3 text-[11px] leading-4 text-gray-500 dark:text-gray-400">
        {scene.purposeSi}
      </Text>

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
      <View
        onLayout={onCanvasLayout}
        style={{ height: canvasHeight, backgroundColor: c.bg }}
        className="justify-center"
      >
        {width > 0 ? (
          <Scene
            t={t}
            width={width}
            height={canvasHeight}
            isDark={isDark}
            reduceMotion={reduceMotion}
          />
        ) : null}
      </View>

      {/* ── Scrubber ─────────────────────────────────────────────────────── */}
      <GestureDetector gesture={scrub}>
        <View
          className="px-4 py-3"
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width - 32)}
        >
          <View className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <View
              className="h-full rounded-full"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: palette.primary[600],
              }}
            />
            {/* Stage boundaries as ticks, so the student can see the structure. */}
            {scene.stages.map((stage) => (
              <View
                key={stage.id}
                className="absolute h-1.5 w-0.5"
                style={{
                  left: `${(stage.at / scene.duration) * 100}%`,
                  backgroundColor: isDark ? palette.gray[500] : '#FFFFFF',
                }}
              />
            ))}
          </View>
        </View>
      </GestureDetector>

      {/* ── Transport ────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-center gap-5 pb-3">
        <Pressable
          onPress={stepBack}
          accessibilityRole="button"
          accessibilityLabel="පෙර පියවර"
          className="p-2 active:opacity-60"
        >
          <Ionicons name="play-skip-back" size={20} color={palette.gray[500]} />
        </Pressable>

        <Pressable
          onPress={togglePlay}
          disabled={reduceMotion}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'විරාම' : 'ධාවනය'}
          className="h-12 w-12 items-center justify-center rounded-full active:opacity-80"
          style={{
            backgroundColor: reduceMotion ? palette.gray[400] : palette.primary[600],
          }}
        >
          <Ionicons
            name={atEnd ? 'refresh' : playing ? 'pause' : 'play'}
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

        <Pressable
          onPress={stepForward}
          accessibilityRole="button"
          accessibilityLabel="ඊළඟ පියවර"
          className="p-2 active:opacity-60"
        >
          <Ionicons name="play-skip-forward" size={20} color={palette.gray[500]} />
        </Pressable>

        <Pressable
          onPress={replay}
          accessibilityRole="button"
          accessibilityLabel="නැවත"
          className="p-2 active:opacity-60"
        >
          <Ionicons name="reload" size={18} color={palette.gray[500]} />
        </Pressable>
      </View>

      {/* ── Stage chips: jump straight to any step ───────────────────────── */}
      <View className="flex-row flex-wrap gap-1.5 px-4 pb-3">
        {scene.stages.map((stage, i) => {
          const isActive = i === activeIndex;
          return (
            <Pressable
              key={stage.id}
              onPress={() => {
                setPlaying(false);
                setTime(stage.at);
              }}
              className="rounded-full px-2.5 py-1 active:opacity-70"
              style={{
                backgroundColor: isActive
                  ? palette.primary[600]
                  : isDark
                    ? palette.gray[800]
                    : palette.gray[100],
              }}
            >
              <Text
                className="text-[10px] font-semibold"
                style={{
                  color: isActive ? '#FFFFFF' : isDark ? palette.gray[300] : palette.gray[600],
                }}
              >
                {i + 1}. {stage.titleSi}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Caption and takeaway ─────────────────────────────────────────── */}
      {activeStage ? (
        <View className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <Text className="text-xs leading-5 text-gray-700 dark:text-gray-300">
            {activeStage.captionSi}
          </Text>

          {/* The takeaway is the exam-relevant sentence, so it is visually
              separated rather than buried in the narration. */}
          {activeStage.takeawaySi ? (
            <View
              className="mt-2.5 flex-row rounded-xl p-2.5"
              style={{
                backgroundColor: isDark
                  ? 'rgba(139,92,246,0.14)'
                  : 'rgba(139,92,246,0.09)',
              }}
            >
              <Ionicons
                name="bulb"
                size={14}
                color={palette.accent[isDark ? 400 : 600]}
                style={{ marginTop: 1 }}
              />
              <Text
                className="ml-2 flex-1 text-xs font-semibold leading-5"
                style={{ color: isDark ? palette.accent[200] : palette.accent[800] }}
              >
                {activeStage.takeawaySi}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {reduceMotion ? (
        <Text className="px-4 pb-3 text-[10px] italic text-gray-400">
          චලන අඩු කිරීම සක්‍රීයයි — අවසන් තත්ත්වය පෙන්වා ඇත. පියවර බොත්තම් භාවිතා කරන්න.
        </Text>
      ) : null}
    </View>
  );
}
