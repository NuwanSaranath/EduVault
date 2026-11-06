import type { ComponentType } from 'react';
import type { Stage } from './timing';

export type { Stage };

// what a scene gets. no callbacks, store or navigation, it only draws, so
// it can be drawn at any t
export interface SceneProps {
  // seconds, 0..duration
  t: number;
  // canvas size, scenes use these not fixed numbers
  width: number;
  height: number;
  isDark: boolean;
  // reduce motion is on. draw the finished diagram, not t = 0
  reduceMotion: boolean;
}

export type SceneKind = 'practical' | 'concept';

// one animation and its info.
// scenes are components, not some animation data format. one format for
// alpha scattering, energy levels and orbitals would be too limited or turn
// into svg anyway. lessons pick them by id
export interface AnimationScene {
  id: string;
  // syllabus section e.g. '1.1.4', shown as a chip
  sectionNumber: string;
  titleSi: string;
  titleEn: string;
  // practical = a real experiment from the syllabus, concept = an idea.
  // shown in the ui because students revising "පරීක්ෂණ" want the experiments
  kind: SceneKind;
  // what the student should learn from it
  purposeSi: string;
  // seconds
  duration: number;
  stages: Stage[];
  Component: ComponentType<SceneProps>;
}

// colours worked out once per scene for light/dark
export interface SceneColors {
  bg: string;
  grid: string;
  axis: string;
  label: string;
  labelStrong: string;
  // particles, same in every scene
  proton: string;
  neutron: string;
  electron: string;
  nucleus: string;
  // other colours
  beam: string;
  highlight: string;
  danger: string;
  success: string;
  muted: string;
}
