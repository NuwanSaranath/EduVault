# 3. Architecture & Design

## Layers

```
┌───────────────────────────────────────────────────────────────┐
│  app/                    expo-router file routes             │
│                          thin — each file renders a screen   │
├───────────────────────────────────────────────────────────────┤
│  src/screens/            screen composition, layout          │
│  src/components/         reusable + custom UI                │
├───────────────────────────────────────────────────────────────┤
│  src/store/              Zustand — optimistic UI state       │
├───────────────────────────────────────────────────────────────┤
│  src/services/           use-case API the screens call       │
├───────────────────────────────────────────────────────────────┤
│  src/features/           pure domain logic (no I/O)          │
│    quiz/adaptive.ts        selection algorithm               │
│    flashcards/build.ts     deck construction                 │
│    progress/snapshot.ts    progress shape + identity         │
│    hardware/               capture pipeline                  │
├───────────────────────────────────────────────────────────────┤
│  src/db/                 SQLite — local source of truth      │
│    schema.ts               DDL + migrations                  │
│    repositories/           one module per aggregate           │
│    cachePolicy.ts          LRU budget enforcement            │
├───────────────────────────────────────────────────────────────┤
│  src/sync/               reconciliation with the backend     │
│    engine.ts               NetInfo listener, outbox drain    │
│    push.ts / pull.ts       per-entity transport              │
│    merge.ts / policy.ts    pure conflict + gating rules      │
├───────────────────────────────────────────────────────────────┤
│  Firebase                Auth + Firestore                    │
└───────────────────────────────────────────────────────────────┘
```

## The decision that shapes everything else

**SQLite is the source of truth; the network is an optimisation.**

Screens never await the network for content. They ask a service, the service asks a
repository, the repository reads SQLite, and an answer comes back in milliseconds
whether or not there is signal. Freshness is the sync engine's job, running
independently on a connectivity listener.

The consequence worth noting: **no content screen has a network error state.** There
is no "failed to load, retry?" anywhere in the app, because no content read can fail
for network reasons. The only network-dependent flows are sign-in (you cannot verify
a password offline) and the leaderboard (a ranking against others is meaningless
without others).

## Read path

```
TheoryLessonScreen
  → useAsyncData(fetchLesson)
    → services/theory.fetchLesson
      → db/repositories/contentRepo.getLesson
        → SELECT payload FROM lessons WHERE id = ?
        → UPDATE lessons SET last_read_at = ?   ← side effect: LRU stamp
```

That `last_read_at` write is deliberate. Reading a lesson is also the act of
protecting it from cache eviction, so the budget never deletes what a student is
actually using.

## Write path

Every user mutation is optimistic and dual-written in one transaction:

```
QuizSessionScreen submits
  → progressStore.addQuizAttempt(attempt)
      ├─ set({ xp, attempts, badges })          ← UI updates synchronously
      └─ void saveAttempt(attempt)              ← not awaited
            └─ db.withTransactionAsync:
                 INSERT INTO quiz_attempts …
                 INSERT INTO outbox …           ← same transaction
```

The transaction is the important part. Because the local row and its outbox entry
commit together, "saved on the device but never queued for upload" is not a
reachable state. If the outbox insert fails, the attempt rolls back too, and the
student sees an error instead of silently losing a result days later.

The store does not await the write. A student finishing a quiz should see their XP
immediately, not after a disk round-trip.

## Sync path

```
NetInfo: offline → online
  → engine.drain()
      ├─ policy.syncPlan(net, dataSaver)     → what may sync right now
      ├─ outboxRepo.nextBatch(…)             → oldest-first, media filtered
      ├─ for each row: push.pushRow(row)
      │     success → DELETE FROM outbox; mark local row synced
      │     failure → attempts += 1; schedule backoff; stop if network
      └─ if plan.pullContent → pull.pullContent()  → incremental, cursor-based
            └─ cachePolicy.enforceCacheBudget()
```

The engine is not a React hook. Drains are triggered by connectivity changes and by
explicit user action, both of which can happen while no relevant screen is mounted.
It owns the sync status and publishes it to `syncStore`, which is a thin React mirror
so components can subscribe with the same hook shape as everything else.

## Why the folders are laid out this way

**`features/` holds only pure functions.** No database, no clock, no `Math.random`
unless injected. That is what makes the adaptive algorithm and the merge strategies
unit-testable without a device — and 60 tests run in ~3 seconds as a result. The
`ProgressSnapshot` type lives in `features/progress/snapshot.ts` rather than in the
repository that persists it, specifically so `sync/merge.ts` can use it without
dragging SQLite's native modules into a test process.

**`db/repositories/` is one module per aggregate**, and repositories are the only
code that writes SQL. A service never issues a query; a screen never sees a row.
That boundary is why swapping `simulateRequest` for real persistence touched no
screen at all — the service signatures did not change shape.

**`sync/` is separate from `db/`** because they answer different questions. `db`
answers "what does this device know"; `sync` answers "is that in step with the
server". Merging them would put conflict resolution next to DDL, and the merge rules
are the part most worth reading in isolation.

**`app/` files are one-liners** that render a screen from `src/screens/`. Routing
concerns stay in `app/`; composition stays in `src/`. This means a screen can be
tested or reused without the router, and the route tree is readable at a glance.

## Firestore layout

```
users/{uid}                        → profile
users/{uid}/attempts/{id}          → QuizAttempt      append-only
users/{uid}/paperResults/{id}      → PastPaperResult  append-only
users/{uid}/planner/{id}           → PlannerEvent     last-write-wins
users/{uid}/progress/summary       → ProgressSnapshot merged
users/{uid}/bookmarks/{lessonId}   → pin marker
users/{uid}/tutorQuestions/{id}    → queued questions
subjects/{id} chapters/{id} lessons/{id} questions/{id} pastPapers/{id}
                                   → content, read-only to clients
leaderboard/{uid}                  → aggregate, read-only to clients
```

User-owned data is nested under `users/{uid}` so the entire ownership rule is one
uid comparison — see [firestore.rules](../firestore.rules). Content is top-level and
client-read-only; it is published by the authoring action in Settings, not by a
student session.

## Related documents

- [04-offline-sync.md](04-offline-sync.md) — the outbox, conflict strategies, demo script
- [05-constraint-design.md](05-constraint-design.md) — the four constrained-design policies
- [08-custom-components.md](08-custom-components.md) — props and events for each custom component
- [decision-records/](decision-records/) — the four decisions with the most consequence
