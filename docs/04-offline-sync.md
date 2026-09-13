# 4. Offline Access & Sync

## The distinction that matters

**Persistence is not sync.** Saving state to AsyncStorage so it survives a restart is
persistence — the earlier version of this app had that, and nothing ever left the
device. The assignment requires data to *sync back once the app comes back online*,
which needs three things persistence alone does not provide:

1. A durable queue of pending mutations (the **outbox**)
2. Something watching for connectivity to drain it (the **sync engine**)
3. A rule for what happens when both sides changed (**conflict resolution**)

## 1. Local source of truth — SQLite

`expo-sqlite`, schema in [src/db/schema.ts](../src/db/schema.ts).

Content tables (`subjects`, `chapters`, `lessons`, `questions`, `past_papers`) store
the full entity as JSON in a `payload` column and lift only the columns actually
filtered or sorted on. A content type can grow a field without a migration — and
`Lesson` grows them often (`practiceItems`, `videoSuggestions`, `memoryTricks`).

**Why not just AsyncStorage:** it rehydrates the entire JSON blob into memory on
boot. Lesson payloads here carry guided-teaching content and Sinhala text. SQLite
lets one lesson be read at a time, and gives indexes, transactions, and a queryable
LRU ordering — none of which a key-value store offers. See
[ADR 0001](decision-records/0001-sqlite-over-asyncstorage.md).

**Cold start:** a first launch with no signal would otherwise show an empty shell, so
[src/db/bootstrap.ts](../src/db/bootstrap.ts) loads a bundled copy of the syllabus
into SQLite when the cache is empty. Bundled rows are stamped `updatedAt` = epoch so
the first real pull always wins the cursor comparison.

## 2. The outbox

```sql
CREATE TABLE outbox (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entity       TEXT NOT NULL,   -- quizAttempt | paperResult | plannerEvent |
                                -- progress | bookmark | tutorQuestion
  op           TEXT NOT NULL,   -- create | update | delete
  entity_id    TEXT NOT NULL,
  payload      TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  needs_media  INTEGER NOT NULL DEFAULT 0,   -- gates on Data Saver
  media_uri    TEXT
);
```

Every mutation is appended here **in the same transaction that writes the local
row**:

```ts
// src/db/repositories/attemptRepo.ts
await db.withTransactionAsync(async () => {
  await db.runAsync('INSERT OR REPLACE INTO quiz_attempts …', …);
  await enqueue(db, { entity: 'quizAttempt', op: 'create', … });
});
```

If the outbox insert fails, the local row rolls back with it. "Saved but never
queued" is unreachable by construction rather than by care.

`needs_media` exists so image-bearing rows can be excluded from a batch on a metered
connection while everything else still flushes.

## 3. The sync engine

[src/sync/engine.ts](../src/sync/engine.ts). Deliberately not a React hook — drains
happen on connectivity changes and user action, when no relevant screen may be
mounted.

```
startSyncEngine()  ← once, from useAppBootstrap
  │
  ├─ NetInfo.addEventListener  → drain() on the offline→online edge only
  │                              (Android emits several events per transition;
  │                               draining on each would fire redundant batches)
  └─ NetInfo.fetch()           → one drain at cold start, because a device that
                                 is already online may never emit a transition
```

Inside `drain()`:

- **Re-entrancy guard.** A second trigger while draining is a no-op. Nothing is lost — the outbox is the source of truth, and the listener fires again on the next transition.
- **Oldest-first batches**, size from `syncPlan`.
- **Per-row exponential backoff** (2s → 64s, capped), held in memory keyed by row id. Per-row rather than per-engine, so one poison message does not throttle healthy rows queued behind it. Not persisted: a restart is itself a reason to retry immediately.
- **Failure triage.** `PermanentPushError` (bad data) skips that row and keeps draining. A network error stops the batch immediately rather than burning every remaining row's retry budget on the same failure.
- **Dead letters.** After 5 attempts a row stops retrying and surfaces in Settings with a manual "Retry failed" button. Silent discard is the one outcome worse than a visible failure.

## 4. Conflict resolution

There is no single strategy, because "newest wins" is correct for a planner event and
actively **wrong** for XP: if a student does a quiz on a tablet and another on a
phone, last-write-wins silently discards one of them.

Each entity gets the weakest rule that is still correct for its semantics
([src/sync/merge.ts](../src/sync/merge.ts)):

| Data | Strategy | Why |
|---|---|---|
| `QuizAttempt`, `PastPaperResult` | **Append-only**, client UUID | Immutable events. No conflict is possible — the ideal case, and why most user data here is modelled as an event log. |
| `xp`, `streakDays` | **Monotonic** — `max(local, remote)` | A counter must never regress. Two devices both earning XP must not lose the higher total. |
| `completedChapterIds`, `unlockedBadgeIds` | **Set union** | Completion is irreversible, so union cannot lose real progress even from a stale side. |
| `lastStudyDateIso` | **Later wins** | A streak is anchored to the most recent study day. |
| `PlannerEvent`, profile | **Last-write-wins** on `updatedAt` | Genuinely mutable intent. Ties resolve to local — the device in the student's hand expressed the most recent intent. |

Two properties are asserted in [the tests](../src/sync/__tests__/merge.test.ts):

- **Commutative** — `merge(a,b) == merge(b,a)`, so arrival order cannot change the result.
- **Idempotent** — `merge(a,a) == a`, so a replayed push is harmless.

Together these make convergence safe regardless of which device pushes first or how
many times a row is retried.

`mergeProgress` runs **inside a Firestore transaction** on push
([src/sync/push.ts](../src/sync/push.ts)), so the client merges against what the
server actually holds rather than overwriting it. Planner pushes read the remote
`updatedAt` in a transaction too — without that, a mutation that sat in the outbox
for two days would win purely by arriving last.

## 5. Idempotency

Append-only pushes use the client-generated entity id as the Firestore document id.
Replaying a row that already landed is a harmless overwrite with identical data,
which is what makes "push → lose the ack → push again" safe with no server-side
de-duplication.

## 6. Pull — incremental

Every content document carries `updatedAt`; the highest value seen per collection is
stored as a cursor in `sync_meta`. A refresh transfers only what changed. The cursor
advances **only after** the local write succeeds, so a crash mid-write re-pulls
rather than silently skipping a document.

Content is pulled and never pushed — students do not author syllabus data — so this
direction needs no conflict resolution at all.

## 7. Visibility

Offline sync is invisible unless the UI says so, and an invisible feature cannot be
demonstrated.

- [`SyncStatusBanner`](../src/components/SyncStatusBanner.tsx) above the tab bar: collapses to nothing when online with an empty outbox; shows `Offline — 3 changes will sync`, a syncing state, or a tappable retry on failure. Tapping forces a drain.
- Settings → **Offline & Sync**: connection type, the current plan's reason, pending count, unsynced results, queued photo bytes, last sync time, dead letters, and manual Sync now / Retry failed.

## 8. Demo script for the viva

This sequence proves the whole requirement in about 30 seconds:

1. Open Settings → Offline & Sync. Note **Waiting to sync: 0**.
2. Turn on aeroplane mode. The banner appears: *Offline — your work is saved on this device*.
3. Take a quiz and finish it. XP updates **immediately** — no spinner.
4. Add a planner session and bookmark a lesson.
5. Banner now reads *Offline — 3 changes will sync*.
6. Force-quit the app and reopen it. The count is still 3 — the queue is durable, not in memory.
7. Turn aeroplane mode off. The banner goes to *Syncing…*, then disappears.
8. Show the Firebase console: the attempt, the planner event and the bookmark are now under `users/{uid}`.

To demonstrate conflict resolution, sign in on a second device, earn XP there, then
sync both. Neither total is lost — the merged value is the maximum.

To demonstrate the Data Saver policy, enable it in Settings, use Snap & Ask on mobile
data, and observe the text mutations flush while the photo stays queued until Wi-Fi.
