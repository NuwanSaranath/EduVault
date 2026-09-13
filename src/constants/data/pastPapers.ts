import type { PastPaper } from '@/types';
import { SAMPLE_PDF_URL } from './chapters';
import { getQuestionsBySubject } from './questions';

const paperSubjects = ['physics', 'combined-maths', 'chemistry', 'biology', 'ict'];
const years = [2025, 2024, 2023];

export const pastPapers: PastPaper[] = paperSubjects.flatMap((subjectId) =>
  years.map((year) => {
    const subjectQuestions = getQuestionsBySubject(subjectId);
    return {
      id: `${subjectId}-${year}`,
      subjectId,
      year,
      title: `${year} A/L Past Paper`,
      documents: [
        { type: 'MCQ', url: SAMPLE_PDF_URL },
        { type: 'Structured', url: SAMPLE_PDF_URL },
        { type: 'Essay', url: SAMPLE_PDF_URL },
        { type: 'Marking Scheme', url: SAMPLE_PDF_URL },
      ],
      questionIds: subjectQuestions.map((q) => q.id),
      durationMinutes: 180,
    } satisfies PastPaper;
  }),
);

export function getPastPapersBySubject(subjectId: string): PastPaper[] {
  return pastPapers.filter((p) => p.subjectId === subjectId);
}

export function getPastPaperById(id: string): PastPaper | undefined {
  return pastPapers.find((p) => p.id === id);
}
