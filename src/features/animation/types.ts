import type { ComponentType } from 'react';
import type { Stage } from './timing';

export type { Stage };

/**
 * Everything a scene is given. Note what is absent: no callbacks, no store
 * access, no navigation. A scene draws and nothing else, which is why scenes can
 * be rendered at any `t` in any order.
 */
export interface SceneProps {
  /** Elapsed seconds, 0..duration. The scene is a pure function of this. */
  t: number;
  /** Canvas size in px. Scenes lay out against these, never against constants. */
  width: number;
  height: number;
  isDark: boolean;
  /**
   * True when the student has asked for reduced motion. Scenes should render a
   * readable *final* state rather than freezing at t = 0, so the diagram is
   * still useful with no movement at all.
   */
  reduceMotion: boolean;
}

export type SceneKind = 'practical' | 'concept';

/**
 * One animation, with everything the player needs to present it.
 *
 * Scenes are real components in a registry rather than rows of declarative
 * animation data. A generic format would have to express α-particle scattering,
 * an energy-level ladder and an orbital cross-section in the same vocabulary —
 * so it would either be too weak to draw any of them properly, or become a
 * drawing language, which is what SVG already is.
 *
 * Lessons stay data-driven by referencing scenes by **id** (`Lesson.animationIds`),
 * so content decides which animations appear without importing components.
 */
export interface AnimationScene {
  id: string;
  /** Syllabus section this illustrates, e.g. '1.1.4'. Shown as a chip. */
  sectionNumber: string;
  titleSi: string;
  titleEn: string;
  /**
   * `practical` = a reproduction of a real experiment from the syllabus;
   * `concept` = a visualisation of an idea. Surfaced in the UI because a
   * student revising "පරීක්ෂණ" wants the experiments specifically — these are
   * what structured questions ask about.
   */
  kind: SceneKind;
  /** Why this animation exists — what the student should come away knowing. */
  purposeSi: string;
  /** Total length in seconds. */
  duration: number;
  stages: Stage[];
  Component: ComponentType<SceneProps>;
}

/** Palette resolved once per scene so light/dark handling is not repeated. */
export interface SceneColors {
  bg: string;
  grid: string;
  axis: string;
  label: string;
  labelStrong: string;
  /** Subatomic particles, kept consistent across every scene in the app. */
  proton: string;
  neutron: string;
  electron: string;
  nucleus: string;
  /** Semantic accents. */
  beam: string;
  highlight: string;
  danger: string;
  success: string;
  muted: string;
}
