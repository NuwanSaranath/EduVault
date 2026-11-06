// Timing helpers for the lesson animations.
// Main rule: a scene only depends on time t. nothing is remembered between
// frames, give it t and it draws one picture. That gives us:
//  - jump/step: going to 12.5s is just drawing at 12.5
//  - captions use the same t so they always match the drawing
//  - reduce motion: draw once at the end
//  - easy to test, everything here is pure

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

// not clamped, clamp it yourself if needed
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

// how far through [start, end] we are, 0 to 1. 0 before start, 1 after end.
// used everywhere in the scenes
export function segment(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0;
  return clamp((t - start) / (end - start));
}

// smoothstep 3t² - 2t³
export function easeInOut(t: number): number {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

// fast then slow, for things arriving
export function easeOut(t: number): number {
  const x = clamp(t);
  return 1 - (1 - x) * (1 - x);
}

// slow then fast, for things being launched
export function easeIn(t: number): number {
  const x = clamp(t);
  return x * x;
}

// goes 0 -> 1 -> 0 in the window, for a flash/highlight
export function pulse(t: number, start: number, end: number): number {
  const p = segment(t, start, end);
  return Math.sin(p * Math.PI);
}

// items come in one after another.
// overlap: 0 = one at a time, 1 = all together
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

// stages

export interface Stage {
  id: string;
  // seconds from the start
  at: number;
  titleSi: string;
  titleEn: string;
  // caption while this stage is on
  captionSi: string;
  // the exam point, shown highlighted
  takeawaySi?: string;
}

// which stage is on at time t. stages only have a start time and last until
// the next one, so changing timing is one number. returns 0 before the first
export function stageIndexAt(stages: Stage[], t: number): number {
  if (stages.length === 0) return -1;
  let index = 0;
  for (let i = 0; i < stages.length; i += 1) {
    if (t >= stages[i].at) index = i;
    else break;
  }
  return index;
}

// null if there are no stages
export function stageAt(stages: Stage[], t: number): Stage | null {
  const index = stageIndexAt(stages, t);
  return index < 0 ? null : stages[index];
}

// 0..1 through the current stage, last one runs to duration
export function stageProgress(stages: Stage[], t: number, duration: number): number {
  const index = stageIndexAt(stages, t);
  if (index < 0) return 0;
  const start = stages[index].at;
  const end = index + 1 < stages.length ? stages[index + 1].at : duration;
  return segment(t, start, end);
}

// for the step back button. if we're more than graceSeconds into the stage
// go to its start (like the previous track button on a music player),
// otherwise go to the one before
export function previousStageStart(stages: Stage[], t: number, graceSeconds = 0.6): number {
  const index = stageIndexAt(stages, t);
  if (index <= 0) return 0;
  const currentStart = stages[index].at;
  if (t - currentStart > graceSeconds) return currentStart;
  return stages[index - 1].at;
}

// or duration if already in the last one
export function nextStageStart(stages: Stage[], t: number, duration: number): number {
  const index = stageIndexAt(stages, t);
  if (index < 0) return duration;
  return index + 1 < stages.length ? stages[index + 1].at : duration;
}

// geometry

// degrees to radians
export function rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// point at distance from (x, y) at angleDeg. y goes down like in svg
export function project(
  x: number,
  y: number,
  angleDeg: number,
  distance: number,
): { x: number; y: number } {
  const a = rad(angleDeg);
  return { x: x + Math.cos(a) * distance, y: y + Math.sin(a) * distance };
}

// random number 0-1 from a seed. scenes can't use Math.random or particles
// would jump around every frame. same seed = same picture every time
export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
