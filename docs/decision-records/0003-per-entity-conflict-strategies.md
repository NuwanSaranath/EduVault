# ADR 0003 — One conflict strategy per entity, not one for the app

- **Status:** Accepted
- **Date:** 2026-09-12

## Context

Once mutations can be made offline on more than one device, both sides can change the
same data. A single app-wide rule is the obvious simplification, and last-write-wins
on a timestamp is the usual choice.

## Decision

Each entity gets the **weakest rule that is still correct for its semantics**:

| Data | Strategy |
|---|---|
| `QuizAttempt`, `PastPaperResult` | Append-only, client-generated UUID |
| `xp`, `streakDays` | Monotonic — `max(local, remote)` |
| `completedChapterIds`, `unlockedBadgeIds` | Set union |
| `lastStudyDateIso` | Later timestamp wins |
| `PlannerEvent`, user profile | Last-write-wins on `updatedAt`, ties to local |

Implemented as pure functions in [src/sync/merge.ts](../../src/sync/merge.ts).

## Rationale

Last-write-wins is not a neutral default — it **loses data** for two of these shapes:

- **XP.** A student does a quiz on a tablet (XP 900) and later one on a phone that had been offline (XP 300). Under LWW the phone's push lands last and the student's total drops by 600. Under `max` nothing is lost.
- **Completion sets.** A stale device pushing `completedChapterIds: ['ch1']` over a server holding `['ch1','ch2','ch3']` would un-complete two chapters. Completion is irreversible in the domain, so union is both safe and correct.

Conversely, monotonic merging would be *wrong* for a planner event: if a student
changes a session from 18:00 to 20:00, "take the larger value" is meaningless. There
is a genuine most-recent intent, and LWW expresses it.

Modelling most user data as an **append-only event log** is the deeper decision here.
Quiz attempts and paper results are immutable facts with client-generated ids, so no
conflict is possible at all. Aggregates like XP are *derived* — the only mutable
document in the app is the progress snapshot, which is therefore the only one needing
a real merge.

Ties in `mergePlannerEvent` resolve to **local** because the device in the student's
hand is the one whose intent they just expressed.

## Verification

Two properties are asserted in
[merge.test.ts](../../src/sync/__tests__/merge.test.ts):

- **Commutative** — `merge(a,b) === merge(b,a)`, so arrival order cannot change the outcome.
- **Idempotent** — `merge(a,a) === a`, so a replayed push is harmless.

Together these mean the two devices converge to the same state regardless of which
pushes first or how many times a row is retried. That is the property that makes the
whole retry-with-backoff design safe.

`mergeProgress` runs inside a Firestore transaction on push, so the client merges
against what the server actually holds rather than against a stale read.

## Consequences

**Positive**

- No data-loss class of bug from concurrent devices.
- The rules are pure functions, so they are testable and reviewable in isolation.
- `EMPTY_SNAPSHOT` acts as an identity element, which lets "no remote document yet" and "an empty remote document" be the same code path.

**Negative**

- Five rules to explain instead of one.
- Adding a new synced entity requires a deliberate choice of strategy rather than inheriting a default — which is the intent, but it is a real cost.
- Monotonic merging means a genuine correction (e.g. an admin reducing XP) cannot be pushed from a client. Acceptable: clients have no business reducing a student's XP.
