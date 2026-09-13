import { doc, writeBatch } from 'firebase/firestore';
import { subjects } from '@/constants/data/subjects';
import { chapters, lessons } from '@/constants/data/chapters';
import { questions } from '@/constants/data/questions';
import { pastPapers } from '@/constants/data/pastPapers';
import { getFirestoreDb, isFirebaseConfigured } from '@/services/firebase';

/**
 * One-shot uploader that publishes the bundled syllabus to Firestore.
 *
 * Deliberately an in-app action rather than a standalone Node script. The
 * content lives in TypeScript modules behind the `@/` path alias, so a Node
 * seeder would need its own transpile + alias-resolution toolchain to read the
 * exact same data the app reads. Running it inside the app reuses Metro's module
 * graph, which means the seeded documents are guaranteed to match the types the
 * client expects — a separate script can drift.
 *
 * Exposed from the Settings screen in development only. Safe to run repeatedly:
 * every write is keyed by the entity id, so re-seeding overwrites rather than
 * duplicating.
 */

export interface SeedReport {
  subjects: number;
  chapters: number;
  lessons: number;
  questions: number;
  pastPapers: number;
  batches: number;
}

/** Firestore caps a batch at 500 operations. */
const BATCH_LIMIT = 450;

interface Seedable {
  id: string;
}

/**
 * Writes one collection in batches, stamping every document with `updatedAt`.
 *
 * That stamp is the contract the pull cursor depends on: without it a document
 * is invisible to incremental sync, because `where('updatedAt', '>', cursor)`
 * cannot match a missing field.
 */
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
      // The id becomes the document key, so it is not duplicated in the body.
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
