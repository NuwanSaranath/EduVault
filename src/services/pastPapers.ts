import type { PastPaper, PastPaperResult, Question } from '@/types';
import {
  getPastPaper,
  getPastPapers,
  getQuestionsByIds,
} from '@/db/repositories/contentRepo';

// past papers from sqlite. marking is done on the phone so the student gets
// the result as soon as they submit, even with no signal. the result then
// goes through the outbox
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

// mark a paper. only async because questions come from sqlite, the marking
// itself is just maths so it can't fail because of network
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
