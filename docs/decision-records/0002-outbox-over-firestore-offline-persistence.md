# ADR 0002 — An explicit outbox, with Firestore's own offline cache turned off

- **Status:** Accepted
- **Date:** 2026-09-12

## Context

Firestore ships offline persistence. Enabling `persistentLocalCache` would queue
writes and replay them on reconnect with roughly one line of configuration.

## Decision

Configure Firestore with `memoryLocalCache()` — its on-disk persistence is **off** —
and implement the outbox, the drain loop, and conflict resolution in application code.

## Rationale

**Two caches means no owner.** With both SQLite and Firestore's cache holding data,
"what does this device know" has two answers and no rule for reconciling them. The
content cache, the LRU budget and the pinned-bookmark logic all live in SQLite, so
Firestore's cache would be a second, invisible copy with different eviction rules.

**Conflict resolution here is not last-write-wins.** This is the substantive reason.
Firestore's offline queue replays writes in order; the last one to land wins. That is
correct for a planner event and **wrong for XP** — two devices both earning XP would
lose the lower total instead of taking the maximum. The per-entity strategies in
`merge.ts` (monotonic counters, set union, append-only, LWW) cannot be expressed by a
replay queue. They need a transaction that reads the server value and merges.

**Policy control.** Holding image payloads back on metered connections, per-row
exponential backoff, dead-letter surfacing, and smaller batches on cellular are all
decisions about *when and what* to sync. Firestore's queue does not expose those
hooks.

**It is the assignment requirement.** The brief asks the student to implement offline
sync. "The SDK does it" is not an answer that survives a viva — there would be no
mechanism to explain and no design decisions to defend.

## Consequences

**Positive**

- One local source of truth with one eviction policy.
- Per-entity conflict strategies, unit-tested for commutativity and idempotency.
- Full control over batching, backoff, and what a metered connection is allowed to send.
- Every part of the sync path is explainable, which is the point.

**Negative**

- Significantly more code: `engine.ts`, `push.ts`, `pull.ts`, `merge.ts`, `policy.ts`, `outboxRepo.ts`.
- Idempotency is now our responsibility — handled by using client-generated entity ids as Firestore document ids, so a replayed push is a harmless identical overwrite.
- Pull cursors are hand-managed in `sync_meta` rather than handled by snapshot listeners.

## Also decided here

`experimentalForceLongPolling: true`. React Native has no real WebChannel transport,
so streaming reads hang on some carrier networks. Long polling is slower per request
but does not silently stall — which matters more when the entire premise is surviving
a bad connection.
