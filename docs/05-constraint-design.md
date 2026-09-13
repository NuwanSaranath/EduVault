# 5. Constrained Design: Algorithms & Principles

The target device is a mid-range Android phone that a student also uses for
everything else, on a prepaid data plan, with intermittent coverage. Four distinct
constraints follow from that, and each has a named implementation rather than a
general intention.

---

## Policy 1 — Adaptive question selection (the student's *time*)

[src/features/quiz/adaptive.ts](../src/features/quiz/adaptive.ts)

The scarcest resource is not memory or bandwidth, it is study time. A candidate has a
few hundred practice sessions before the exam and thousands of questions available.
Random selection spends most of them re-testing what the student already knows.

```
priority = weakness × staleness × difficulty
```

| Factor | Definition | Why |
|---|---|---|
| **weakness** | `1 − accuracy` on that topic; unseen topics start at `0.5` | Targets gaps. The 0.5 floor means unseen topics are *explored* rather than starved by topics with a known bad record. |
| **staleness** | `1 − 2^(−days/7)` — exponential decay, 7-day half-life | A topic drilled this morning drops near zero and climbs back over a week. This is what stops the same ten questions recurring every session. |
| **difficulty** | Easy 1.0 / Medium 1.15 / Hard 1.3 | A mild tie-breaker only. It must not override a genuine weakness signal. |

Two details that are easy to get wrong:

**Additive floors.** `priority = (0.1 + weakness) × (0.2 + staleness) × difficulty`.
Without the floors, a fully-mastered topic collapses to priority 0 and is *never
revised again*. It should rank last, not be excluded.

**The 70/30 focus split.** Only 70% of a session comes from the top of the ranking;
the rest is sampled from the tail. Without this the algorithm tunnels — a student
weak in one chapter sees nothing else until it is fixed, which is demoralising and
bad exam preparation. [The test suite asserts both halves](../src/features/quiz/__tests__/adaptive.test.ts):
that the weak chapter dominates, *and* that the strong chapter still appears.

Entirely pure — `now` and `random` are injected — so all of this is unit-tested
without a device, and the same `weakestTopics` ranking drives the Progress screen's
"Focus Next" card. One source of truth: the weak areas named to the student are
exactly the ones the next quiz will drill.

Flashcard grades feed the same signal. Cards are built *from* real questions
([src/features/flashcards/build.ts](../src/features/flashcards/build.ts)), so a swipe
produces a real `QuizAttemptAnswer` against a real question id. Recorded as
`quizType: 'Flashcards'` to keep self-reported grades distinguishable from tested
scores.

---

## Policy 2 — Storage budget with LRU eviction (*device storage*)

[src/db/cachePolicy.ts](../src/db/cachePolicy.ts)

A 40 MB ceiling on cached lesson content, enforced by the app itself.

**Why not let the OS reclaim space:** on Android, reclaiming app data means clearing
it *wholesale* — which would take the outbox with it, destroying unsynced results.
The app must stay under budget by choosing what to drop, rather than having the
choice made for it.

Two rules make eviction safe:

1. **Bookmarked lessons are pinned.** A deliberate save outranks the budget. This is why bookmarks moved from AsyncStorage into the `bookmarks` table — the pin set has to be queryable by the eviction SQL.
2. **Only `lessons` is evictable.** Questions and papers are small; user data is never evictable because it may not have synced yet.

Eviction order:

```sql
ORDER BY last_read_at IS NULL DESC, last_read_at ASC
```

Never-read lessons go first — content pulled by a sync but never opened is the
cheapest thing to lose, since re-fetching it costs the student nothing they noticed
having. `last_read_at` is stamped by `getLesson`, so *reading* a lesson is also the
act of protecting it.

Enforcement runs after a pull (the only thing that grows the cache), not on a timer.
Usage and the pinned count are shown in Settings → Storage.

---

## Policy 3 — Network-aware sync policy (*billed data & battery*)

[src/sync/policy.ts](../src/sync/policy.ts)

A pure function asked on **every** drain, so connectivity changes and the Data Saver
toggle both take effect on the next batch with no listener re-wiring.

| Condition | Text | Media | Content pull | Batch |
|---|---|---|---|---|
| Disconnected, or no route out | ✗ | ✗ | ✗ | 0 |
| Wi-Fi / Ethernet | ✓ | ✓ | ✓ | 50 |
| Cellular + Data Saver, or OS-metered | ✓ | ✗ | ✗ | 10 |
| Cellular, no Data Saver | ✓ | ✓ | ✗ | 25 |

Three judgement calls worth defending:

- **`isInternetReachable === null` is treated as usable.** NetInfo reports null before its first probe. A false negative delays every cold-start sync; a false positive costs one retried attempt the outbox handles anyway.
- **Content pull is deferred off Wi-Fi even without Data Saver.** Results are small and urgent; a syllabus refresh is large and never urgent.
- **Smaller batches on metered links.** Each request is billed data — fail fast and cheap rather than pushing 50 rows into a connection that is about to drop.

Battery is addressed by the same design: syncs are **batched and edge-triggered**, not
per-write and not polled. There is no interval timer anywhere in the sync path.

Data Saver is a user-facing switch in Settings, not just internal plumbing — which
makes it demonstrable.

---

## Policy 4 — Capture downscaling (*bandwidth at the source*)

[src/features/hardware/imagePipeline.ts](../src/features/hardware/imagePipeline.ts)

A phone camera produces 3–6 MB per frame. Queued raw, a Snap & Ask taken offline sits
in the outbox as a multi-megabyte blob and then uploads over whatever connection
appears first.

The photo is resized to **1080px wide at 60% JPEG** at capture time — before it is
persisted, before it is queued, before it is billed. That is its only cheap moment.
1080px is the smallest width at which printed exam text stays legible, which is the
actual requirement; image fidelity is not.

Two supporting details:

- **Only downscales.** Resizing to a width larger than the source would upsample, inflating the file for no added legibility.
- **Captures are moved to the document directory.** Camera and `saveAsync` output land in the cache directory, which Android may clear at any time. An outbox row outlives the session, so anything it references must be somewhere durable first.

Bytes saved are reported back and the pending capture total appears in Settings.

---

## Responsive / constrained layout

[src/components/AnswerSheetGrid.tsx](../src/components/AnswerSheetGrid.tsx) has no
fixed dimensions and no breakpoints. It solves for its own layout:

```
minRowWidth  = numberGutter + optionsPerQuestion × (minBubble + gap)
fitColumns   = floor((availableWidth + gap) / (minRowWidth + gap))
columnWidth  = (available − gap × (columns − 1)) / columns
bubbleSize   = clamp(minBubble, (columnWidth − gutter) / options − gap, 38)
```

1 column on a small phone, 3 on a tablet, from measured width against a minimum
legible row — with leftover width spent on larger touch targets rather than dead
space. The 26px minimum bubble keeps every target tappable, and the 38px cap stops a
tablet rendering comically large circles.
