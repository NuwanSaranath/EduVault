import type { PastPaper, PastPaperResult, Question } from '@/types';
import {
  getPastPaper,
  getPastPapers,
  getQuestionsByIds,
} from '@/db/repositories/contentRepo';

/**
 * Past papers, read from the SQLite cache.
 *
 * Grading is intentionally local and synchronous. A student sitting a timed
 * paper must get their result the instant they submit — routing marking through
 * the backend would make the most stressful moment in the app depend on signal.
 * The graded result is then written through the outbox, so the server learns
 * about it whenever the network allows.
 */
export async function fetchAllPastPapers(): Promise<PastPaper[]> {
  return getPastPapers();
}

export async function fetchPastPapers(subjectId: string): Promise<PastPaper[]> {
  return getPastPapers(subjectId);
}

export async function fetchPastPaper(id: string): Promise<PastPaper | undefined> {
  return (await getPastPaper(id)) ?? undefined;
}

export async function fetchPastPaperQuestions(id: string): Promise<Question[]> {
  const paper = await getPastPaper(id);
  if (!paper) return [];
  return getQuestionsByIds(paper.questionIds);
}

/**
 * Marks a submitted paper.
 *
 * Async only because the questions come from SQLite — the marking itself is pure
 * arithmetic over data already in hand, so it cannot fail for network reasons.
 */
export async function gradePastPaper(
  pastPaperId: string,
  answers: { questionId: string; givenAnswer: string; chapterTitle?: string }[],
  totalMarks: number,
  durationSeconds: number,
): Promise<PastPaperResult> {
  const questions = await getQuestionsByIds(answers.map((a) => a.questionId));
  const byId = new Map(questions.map((q) => [q.id, q]));
  const weakAreaCounts = new Map<string, number>();
  let correctCount = 0;

  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question) continue;
    if (question.correctAnswer === answer.givenAnswer) {
      correctCount += 1;
    } else if (answer.chapterTitle) {
      weakAreaCounts.set(answer.chapterTitle, (weakAreaCounts.get(answer.chapterTitle) ?? 0) + 1);
    }
  }

  const weakAreas = [...weakAreaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([title]) => title);

  return {
    id: `result-${pastPaperId}-${Date.now()}`,
    pastPaperId,
    score: Math.round((correctCount / Math.max(1, answers.length)) * totalMarks),
    totalMarks,
    weakAreas,
    takenAt: new Date().toISOString(),
    durationSeconds,
  };
}
