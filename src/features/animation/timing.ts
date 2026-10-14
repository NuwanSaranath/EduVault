/**
 * Pure timing helpers for lesson animations.
 *
 * The whole animation system rests on one rule: **a scene is a pure function of
 * elapsed time**. Nothing accumulates state between frames, no element "remembers"
 * where it was. Given `t`, a scene draws exactly one picture.
 *
 * That rule is what buys the features a teaching animation actually needs:
 *
 *   - **Scrubbing and stepping.** Jumping to t = 12.5s is just rendering at 12.5.
 *     A stateful animation would have to replay 12.5 seconds to get there.
 *   - **Caption sync.** The caption is derived from the same `t` as the drawing,
 *     so they cannot drift apart.
 *   - **Reduce-motion.** Render once at the final `t` and the student sees the
 *     complete diagram with no movement at all.
 *   - **Testability.** Every helper here is pure, so scene timing is verified
 *     without mounting a component or running a clock.
 */

/** Clamps `value` into [min, max]. */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation. `t` is not clamped — callers clamp when they need to. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Normalised progress through the window [start, end], clamped to [0, 1].
 *
 * The workhorse of every scene: "how far through *this part* of the animation
 * are we", independent of the scene's total length. Before `start` it is 0,
 * after `end` it is 1, so an element can be positioned by a single expression
 * rather than a chain of if-statements.
 */
export function segment(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0;
  return clamp((t - start) / (end - start));
}

/** Smooth acceleration and deceleration. Smoothstep: 3t² − 2t³. */
export function easeInOut(t: number): number {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

/** Fast start, gentle settle — for things arriving at a destination. */
export function easeOut(t: number): number {
  const x = clamp(t);
  return 1 - (1 - x) * (1 - x);
}

/** Gentle start, fast finish — for things being launched. */
export function easeIn(t: number): number {
  const x = clamp(t);
  return x * x;
}

/**
 * Ramps to 1 then back to 0 across the window — for a highlight or flash that
 * must not leave residue once the moment has passed.
 */
export function pulse(t: number, start: number, end: number): number {
  const p = segment(t, start, end);
  return Math.sin(p * Math.PI);
}

/**
 * Staggers a list so items enter one after another.
 *
 * @param index       item's position in the list
 * @param count       total items
 * @param t           elapsed seconds
 * @param start       when the first item begins
 * @param each        how long each item takes
 * @param overlap     0 = strictly sequential, 1 = all at once
 */
export function stagger(
  index: number,
  count: number,
  t: number,
  start: number,
  each: number,
  overlap = 0.5,
): number {
  if (count <= 0) return 0;
  const step = each * (1 - overlap);
  const itemStart = start + index * step;
  return segment(t, itemStart, itemStart + each);
}

// ── Stages ─────────────────────────────────────────────────────────────────

export interface Stage {
  id: string;
  /** Seconds from scene start when this stage begins. */
  at: number;
  titleSi: string;
  titleEn: string;
  /** Narration shown under the canvas while this stage is active. */
  captionSi: string;
  /** The exam-relevant conclusion. Shown highlighted — this is the point. */
  takeawaySi?: string;
}

/**
 * Index of the stage active at time `t`.
 *
 * Stages are defined by their start time only; a stage runs until the next one
 * begins. Expressing it that way means re-timing a scene is editing one number
 * rather than keeping adjacent start/end pairs in sync.
 *
 * Returns 0 for any `t` before the first stage, so a scene always has a caption.
 */
export function stageIndexAt(stages: Stage[], t: number): number {
  if (stages.length === 0) return -1;
  let index = 0;
  for (let i = 0; i < stages.length; i += 1) {
    if (t >= stages[i].at) index = i;
    else break;
  }
  return index;
}

/** The stage active at time `t`, or null when there are none. */
export function stageAt(stages: Stage[], t: number): Stage | null {
  const index = stageIndexAt(stages, t);
  return index < 0 ? null : stages[index];
}

/** Progress through the active stage, 0..1. The last stage runs to `duration`. */
export function stageProgress(stages: Stage[], t: number, duration: number): number {
  const index = stageIndexAt(stages, t);
  if (index < 0) return 0;
  const start = stages[index].at;
  const end = index + 1 < stages.length ? stages[index + 1].at : duration;
  return segment(t, start, end);
}

/**
 * Start time of the previous stage boundary, for a "step back" control.
 *
 * Takes the *current* stage's start when the student is more than `graceSeconds`
 * into it — the same behaviour as a music player's previous-track button, where
 * pressing it once restarts the current track. Without the grace period,
 * stepping back mid-stage skips a stage the student was still watching.
 */
export function previousStageStart(stages: Stage[], t: number, graceSeconds = 0.6): number {
  const index = stageIndexAt(stages, t);
  if (index <= 0) return 0;
  const currentStart = stages[index].at;
  if (t - currentStart > graceSeconds) return currentStart;
  return stages[index - 1].at;
}

/** Start time of the next stage, or `duration` when already in the last. */
export function nextStageStart(stages: Stage[], t: number, duration: number): number {
  const index = stageIndexAt(stages, t);
  if (index < 0) return duration;
  return index + 1 < stages.length ? stages[index + 1].at : duration;
}

// ── Geometry ───────────────────────────────────────────────────────────────

/** Degrees → radians. Scenes think in degrees; trigonometry needs radians. */
export function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Point at `distance` from (x, y) along `angleDeg`, SVG-style (y grows down). */
export function project(
  x: number,
  y: number,
  angleDeg: number,
  distance: number,
): { x: number; y: number } {
  const a = rad(angleDeg);
  return { x: x + Math.cos(a) * distance, y: y + Math.sin(a) * distance };
}

/**
 * Deterministic pseudo-random number in [0, 1) from an integer seed.
 *
 * Scenes must not call `Math.random()`: an animation that scatters particles
 * differently every frame would flicker, and one that differs between the
 * student's screen and the teacher's makes a lesson impossible to discuss.
 * Seeding by particle index makes every replay identical.
 */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
