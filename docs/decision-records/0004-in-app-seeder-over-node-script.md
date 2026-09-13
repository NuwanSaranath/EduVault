# ADR 0004 — Publish content from inside the app, not from a Node script

- **Status:** Accepted
- **Date:** 2026-09-12

## Context

Firestore needed to be populated with the syllabus: subjects, chapters, lessons,
questions and past papers. The content already exists as TypeScript modules under
`src/constants/data/`, imported through the `@/` path alias.

The conventional answer is a standalone Node seed script.

## Decision

Implement seeding as an in-app action
([src/services/admin/seedBackend.ts](../../src/services/admin/seedBackend.ts)),
exposed from Settings behind `__DEV__`.

## Rationale

**Toolchain.** A Node script cannot read these modules without its own transpile step
and its own `@/` alias resolution — `tsx`/`ts-node` plus a tsconfig paths plugin, all
duplicating what Metro already does. That is a second build pipeline to maintain for
one operation.

**Drift.** More importantly, a separate script can go out of sync with the app. Running
inside the app means the seeded documents are produced from the exact modules the
client reads, so the published shape is guaranteed to match the types the client
expects. A script that drifts publishes data the app then fails to parse — and the
failure appears at read time on a device, far from the cause.

**It exercises the real path.** The seeder uses the same `getFirestoreDb()` the sync
engine uses, so if the Firebase config is wrong, seeding fails immediately with a
clear error instead of appearing to work and leaving the app unable to read.

## Implementation notes

- Batched at 450 writes (Firestore's limit is 500).
- Every document is stamped `updatedAt`. This is the contract the pull cursor depends on: `where('updatedAt', '>', cursor)` cannot match a missing field, so an unstamped document would be permanently invisible to incremental sync.
- The entity `id` becomes the document key and is stripped from the body, so it is not stored twice.
- Idempotent — keyed by id, so re-running overwrites rather than duplicating.

## Consequences

**Positive**

- No extra toolchain; no possibility of type drift between seeder and client.
- Runs on a device or simulator with no extra credentials setup.
- Safe to re-run, which makes iterating on content cheap.

**Negative**

- `__DEV__` is the only thing keeping it out of release builds. A stronger gate (a separate build variant, or moving it to a Cloud Function with admin credentials) would be correct for production.
- It writes with the signed-in student's credentials, so `firestore.rules` must temporarily permit content writes while seeding. The committed rules deny client content writes; seeding a fresh project requires relaxing them, seeding, then restoring — noted here because it is a real operational step, not an oversight.

## Alternative for production

A Cloud Function or an Admin SDK script using a service account, triggered by an
authoring tool. That is the right shape once content is authored by teachers rather
than bundled — at which point the bundled seed becomes only a cold-start fallback and
the in-app publisher can be deleted.
