import { subjects } from '../subjects';
import { chapters, lessons } from '../chapters';
import { questions } from '../questions';
import { pastPapers } from '../pastPapers';

/**
 * Guards the bundled seed that `bootstrapContent` loads into SQLite on first
 * launch.
 *
 * This matters more than it looks. `chapters` and `lessons` are built by a loop
 * at module load rather than written out as literals, so a refactor can empty
 * them without any type error — and the symptom would be a first launch that
 * shows a working app with no content, which is easy to mistake for a sync
 * problem. These assertions turn that into a failing test instead.
 *
 * Referential integrity is checked too, because the seeder writes these straight
 * to Firestore: a dangling chapter → subject reference would be published as
 * real data rather than caught locally.
 */
describe('bundled seed content', () => {
  it('is not empty', () => {
    expect(subjects.length).toBeGreaterThan(0);
    expect(chapters.length).toBeGreaterThan(0);
    expect(lessons.length).toBeGreaterThan(0);
    expect(questions.length).toBeGreaterThan(0);
    expect(pastPapers.length).toBeGreaterThan(0);
  });

  it('has unique ids per collection', () => {
    // Ids become primary keys in SQLite and document keys in Firestore, so a
    // duplicate silently overwrites rather than erroring.
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    expect(unique(subjects.map((s) => s.id))).toBe(true);
    expect(unique(chapters.map((c) => c.id))).toBe(true);
    expect(unique(lessons.map((l) => l.id))).toBe(true);
    expect(unique(questions.map((q) => q.id))).toBe(true);
    expect(unique(pastPapers.map((p) => p.id))).toBe(true);
  });

  it('has every chapter pointing at a real subject', () => {
    const subjectIds = new Set(subjects.map((s) => s.id));
    const orphans = chapters.filter((c) => !subjectIds.has(c.subjectId));
    expect(orphans.map((c) => c.id)).toEqual([]);
  });

  it('has every lesson pointing at a real chapter', () => {
    const chapterIds = new Set(chapters.map((c) => c.id));
    const orphans = lessons.filter((l) => !chapterIds.has(l.chapterId));
    expect(orphans.map((l) => l.id)).toEqual([]);
  });

  it('has every question pointing at a real subject', () => {
    const subjectIds = new Set(subjects.map((s) => s.id));
    const orphans = questions.filter((q) => !subjectIds.has(q.subjectId));
    expect(orphans.map((q) => q.id)).toEqual([]);
  });

  it('has MCQ questions whose correct answer is one of their options', () => {
    // The adaptive algorithm and the answer-sheet letter mapping both rely on
    // `correctAnswer` being findable in `options` via indexOf.
    const broken = questions.filter(
      (q) => q.type === 'MCQ' && q.options !== undefined && !q.options.includes(q.correctAnswer),
    );
    expect(broken.map((q) => q.id)).toEqual([]);
  });

  it('has past papers referencing questions that exist', () => {
    const questionIds = new Set(questions.map((q) => q.id));
    const dangling = pastPapers.flatMap((paper) =>
      paper.questionIds.filter((id) => !questionIds.has(id)).map((id) => `${paper.id}:${id}`),
    );
    expect(dangling).toEqual([]);
  });

  it('has lesson counts on chapters matching their lesson ids', () => {
    const mismatched = chapters.filter((c) => c.lessonIds.length !== c.totalLessons);
    expect(mismatched.map((c) => c.id)).toEqual([]);
  });
});
