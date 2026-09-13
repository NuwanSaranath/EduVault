import type { PlannerEvent } from '@/types';
import { getEvents, softDeleteEvent, upsertEvent } from '@/db/repositories/plannerRepo';

/**
 * Study planner persistence.
 *
 * Planner events are the only user-owned data that is genuinely mutable, so they
 * are the only entity that needs last-write-wins. Every write here goes through
 * `plannerRepo`, which pairs the local row with an outbox entry in one
 * transaction — the store updates optimistically and never awaits the network.
 */
export async function fetchPlannerEvents(): Promise<PlannerEvent[]> {
  return getEvents();
}

export async function savePlannerEvent(event: PlannerEvent): Promise<void> {
  await upsertEvent(event);
}

export async function deletePlannerEvent(eventId: string): Promise<void> {
  // Soft delete: the tombstone has to outlive the local row long enough to be
  // pushed, or a delete made offline would simply never reach the server.
  await softDeleteEvent(eventId);
}
