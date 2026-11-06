import type { PlannerEvent } from '@/types';
import { getEvents, softDeleteEvent, upsertEvent } from '@/db/repositories/plannerRepo';

// planner. events are the only user data that gets edited, so they use last
// write wins. plannerRepo saves the row and the outbox entry together
export async function fetchPlannerEvents(): Promise<PlannerEvent[]> {
  return getEvents();
}

export async function savePlannerEvent(event: PlannerEvent): Promise<void> {
  await upsertEvent(event);
}

export async function deletePlannerEvent(eventId: string): Promise<void> {
  // soft delete so it can still be pushed if done offline
  await softDeleteEvent(eventId);
}
