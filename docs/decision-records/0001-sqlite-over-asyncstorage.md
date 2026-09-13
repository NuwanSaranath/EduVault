# ADR 0001 — SQLite as the local source of truth, not AsyncStorage

- **Status:** Accepted
- **Date:** 2026-09-12

## Context

The app already persisted every Zustand store to AsyncStorage via the `persist`
middleware. State survived restarts, so it *looked* like offline support was done.

It was not. Persistence is not sync — nothing ever left the device, and there was no
queue, no connectivity detection, and no conflict rule. Building those on top of
AsyncStorage would have meant hand-rolling a queue in a key-value blob.

## Decision

Use `expo-sqlite` as the local source of truth for content and user data. Keep
AsyncStorage only for genuinely device-local preferences: theme, language, Data Saver,
the auth session, and OS notification handles.

## Rationale

**Memory.** AsyncStorage rehydrates an entire JSON blob into memory on boot. Lesson
payloads here carry guided-teaching content, practice items and Sinhala text. SQLite
reads one lesson at a time.

**The outbox needs a table.** Ordered, oldest-first, with per-row attempt counters and
atomic insertion alongside the local write. That is a relational problem. In a
key-value store it would be an array that has to be read, mutated and rewritten
whole — which is not transactional with the row it accompanies.

**LRU eviction needs a query.** `ORDER BY last_read_at IS NULL DESC, last_read_at ASC`
with a `NOT IN (SELECT lesson_id FROM bookmarks)` exclusion is one statement. In
AsyncStorage it is a full scan and sort in JS on every enforcement pass.

**Transactions.** The local row and its outbox entry commit together, which is what
makes "saved but never queued" unreachable. AsyncStorage has no transactions.

## Consequences

**Positive**

- Content reads are indexed and bounded rather than whole-blob.
- The outbox is durable and ordered, and survives force-quit.
- The cache budget has something meaningful to rank by.
- Screens gained no complexity: services kept their promise-returning shape, so the swap touched no screen signature.

**Negative**

- A migration path is now owned code (`schema.ts` + `user_version` pragma).
- The stores needed an explicit hydrate step at boot (`useAppBootstrap`), where `persist` had done it implicitly.
- Two stores had to stop using `persist` entirely — having both SQLite and AsyncStorage hold progress would give two answers with no rule for which wins after a sync.

## Notes

`bookmarkStore` moved to SQLite for a second reason beyond persistence: the
`bookmarks` table is what pins a lesson against cache eviction, so the eviction SQL
has to be able to see it. A bookmark held only in AsyncStorage would let the budget
delete the very lesson the student saved.
