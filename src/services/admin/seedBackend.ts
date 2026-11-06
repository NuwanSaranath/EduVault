import { doc, writeBatch } from 'firebase/firestore';
import { subjects } from '@/constants/data/subjects';
import { chapters, lessons } from '@/constants/data/chapters';
import { questions } from '@/constants/data/questions';
import { pastPapers } from '@/constants/data/pastPapers';
import { getFirestoreDb, isFirebaseConfigured } from '@/services/firebase';

// Uploads the bundled syllabus to firestore (dev only, button in settings).
// Done in the app instead of a node script because the data is in ts files
// using the @/ alias, a node script would need its own setup and could end up
// different from what the app reads.
// Safe to run again, docs use the entity id so it just overwrites.

export interface SeedReport {
  subjects: number;
  chapters: number;
  lessons: number;
  questions: number;
  pastPapers: number;
  batches: number;
}

// firestore max is 500 per batch
const BATCH_LIMIT = 450;

interface Seedable {
  id: string;
}

// write one collection in batches and add updatedAt to every doc. pull
// needs updatedAt (where updatedAt > cursor) or it never sees the doc
async function seedCollection<T extends Seedable>(
  collectionName: string,
  items: T[],
  stamp: string,
): Promise<number> {
  const db = getFirestoreDb();
  let batches = 0;

  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const slice = items.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);

    for (const item of slice) {
      const { id, ...rest } = item;
      // id is the doc key, no need to also put it in the body
      batch.set(doc(db, collectionName, id), { ...rest, updatedAt: stamp });
    }

    await batch.commit();
    batches += 1;
  }

  return batches;
}

export async function seedBackend(): Promise<SeedReport> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured — add EXPO_PUBLIC_FB_* to .env first');
  }

  const stamp = new Date().toISOString();
  let batches = 0;

  batches += await seedCollection('subjects', subjects, stamp);
  batches += await seedCollection('chapters', chapters, stamp);
  batches += await seedCollection('lessons', lessons, stamp);
  batches += await seedCollection('questions', questions, stamp);
  batches += await seedCollection('pastPapers', pastPapers, stamp);

  return {
    subjects: subjects.length,
    chapters: chapters.length,
    lessons: lessons.length,
    questions: questions.length,
    pastPapers: pastPapers.length,
    batches,
  };
}
