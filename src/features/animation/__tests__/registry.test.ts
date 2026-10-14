import { lessons } from '@/constants/data/chapters';
import { animationScenes, getScene, missingSceneIds, scenesForLesson } from '../registry';

/**
 * Integrity checks for the animation catalogue.
 *
 * Stage timings are plain numbers written by hand beside each scene, and a
 * mistyped one fails in a way that is easy to miss on a device: a stage whose
 * `at` exceeds the scene duration is simply never reachable, so the student
 * never sees that step and nothing errors. These assertions catch exactly the
 * mistakes that stay invisible when you watch the animation once.
 */
describe('animation registry', () => {
  it('has unique scene ids', () => {
    const ids = animationScenes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every scene a positive duration', () => {
    for (const scene of animationScenes) {
      expect(scene.duration).toBeGreaterThan(0);
    }
  });

  it('gives every scene at least two stages', () => {
    // A single-stage animation has nothing to step through, which is the whole
    // point of the player's transport controls.
    for (const scene of animationScenes) {
      expect(scene.stages.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('starts every scene at t = 0', () => {
    // The player renders stage 0 before playback begins; a first stage starting
    // later would leave the caption panel describing a frame not on screen.
    for (const scene of animationScenes) {
      expect(scene.stages[0].at).toBe(0);
    }
  });

  it('keeps stages in strictly increasing time order', () => {
    for (const scene of animationScenes) {
      for (let i = 1; i < scene.stages.length; i += 1) {
        expect(scene.stages[i].at).toBeGreaterThan(scene.stages[i - 1].at);
      }
    }
  });

  it('keeps every stage inside the scene duration', () => {
    // The failure this exists for: an unreachable final stage.
    for (const scene of animationScenes) {
      for (const stage of scene.stages) {
        expect(stage.at).toBeLessThan(scene.duration);
      }
    }
  });

  it('leaves the last stage enough time to be read', () => {
    for (const scene of animationScenes) {
      const last = scene.stages[scene.stages.length - 1];
      expect(scene.duration - last.at).toBeGreaterThanOrEqual(1.2);
    }
  });

  it('has unique stage ids within each scene', () => {
    for (const scene of animationScenes) {
      const ids = scene.stages.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('gives every stage a caption', () => {
    for (const scene of animationScenes) {
      for (const stage of scene.stages) {
        expect(stage.captionSi.trim().length).toBeGreaterThan(0);
        expect(stage.titleSi.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('describes what each scene is for', () => {
    for (const scene of animationScenes) {
      expect(scene.purposeSi.trim().length).toBeGreaterThan(0);
      expect(scene.sectionNumber).toMatch(/^\d+\.\d+/);
    }
  });

  it('ends every practical with a stated conclusion', () => {
    // An experiment animation that never says what was concluded is decoration.
    // Structured questions ask for the conclusion, so it must be on screen.
    for (const scene of animationScenes.filter((s) => s.kind === 'practical')) {
      const hasTakeaway = scene.stages.some((s) => (s.takeawaySi ?? '').trim().length > 0);
      expect(hasTakeaway).toBe(true);
    }
  });
});

describe('lookup', () => {
  it('finds a scene by id', () => {
    expect(getScene('anim-rutherford-gold-foil')?.kind).toBe('practical');
  });

  it('returns undefined for an unknown id', () => {
    expect(getScene('anim-does-not-exist')).toBeUndefined();
  });

  it('resolves a lesson id list in order', () => {
    const resolved = scenesForLesson([
      'anim-rutherford-gold-foil',
      'anim-isotopes',
    ]);
    expect(resolved.map((s) => s.id)).toEqual([
      'anim-rutherford-gold-foil',
      'anim-isotopes',
    ]);
  });

  it('skips unknown ids instead of throwing', () => {
    // Content may name an animation before it is built; a missing illustration
    // must never stop a student reading the lesson.
    const resolved = scenesForLesson(['anim-rutherford-gold-foil', 'anim-not-built-yet']);
    expect(resolved).toHaveLength(1);
  });

  it('handles a lesson with no animations', () => {
    expect(scenesForLesson(undefined)).toEqual([]);
    expect(scenesForLesson([])).toEqual([]);
  });
});

describe('content wiring', () => {
  it('has a built scene for every id referenced by lesson content', () => {
    // Catches a typo in `animationIds`, which would otherwise silently hide the
    // Animations tab rather than failing.
    const referenced = lessons.flatMap((lesson) => lesson.animationIds ?? []);
    expect(missingSceneIds(referenced)).toEqual([]);
  });

  it('actually attaches animations to at least one lesson', () => {
    const withAnimations = lessons.filter((l) => (l.animationIds?.length ?? 0) > 0);
    expect(withAnimations.length).toBeGreaterThan(0);
  });

  it('does not reference the same animation from two lessons', () => {
    const referenced = lessons.flatMap((lesson) => lesson.animationIds ?? []);
    expect(new Set(referenced).size).toBe(referenced.length);
  });
});
