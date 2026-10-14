# EduVault

Offline-first A/L exam-preparation app for Sri Lankan students.
Expo SDK 54 · React Native 0.81 · expo-router · SQLite · Firebase · NativeWind

SE5070 Enterprise Mobility — project area **0 (EdTech)**.

---

## Quick start

```bash
npm install --legacy-peer-deps
cp .env.example .env          # optional — see below
npm start
```

> `--legacy-peer-deps` is required: the project has a pre-existing
> `react-dom@19.3.0` / `react@19.1.0` peer conflict from Expo SDK 54.

**The app runs fully without a `.env`.** With no Firebase config, content comes from
the bundled seed and every mutation queues in the outbox — the same code path as being
offline. Sign-in is the only feature that needs a backend.

### Enabling the backend

1. Create a Firebase project; enable **Email/Password** auth and **Firestore**.
2. Copy the web app config into `.env` (see [.env.example](.env.example)).
3. Deploy the rules: `firebase deploy --only firestore:rules` ([firestore.rules](firestore.rules)).
4. Run the app, go to **Settings → Developer → Publish content to Firestore** (dev builds only).

> Seeding writes with the signed-in student's credentials, and the committed rules deny
> client content writes. Relax the content rules while seeding, then restore them —
> see [ADR 0004](docs/decision-records/0004-in-app-seeder-over-node-script.md).

## Scripts

```bash
npm start            # dev server
npm run android      # / ios / web
npm test             # jest — 131 tests
npx tsc --noEmit     # typecheck
```

## Architecture in one paragraph

**SQLite is the source of truth; the network is an optimisation.** Screens read from a
local database and never await the network for content, so no content screen has a
network error state. Every mutation writes the local row and an outbox entry in one
transaction, so "saved but never queued" is unreachable. A sync engine on a NetInfo
listener drains the outbox oldest-first with per-row backoff, and resolves conflicts
with a different strategy per entity — because last-write-wins is correct for a planner
event and would silently destroy XP.

Full detail: [docs/03-architecture.md](docs/03-architecture.md).

## Layout

```
app/                    expo-router routes (thin)
src/
├─ screens/             screen composition
├─ components/          shared UI, custom components, animations/
├─ store/               Zustand (optimistic UI state)
├─ services/            use-case API the screens call
├─ features/            pure domain logic — no I/O, fully unit-tested
│   ├─ quiz/adaptive.ts     selection algorithm
│   ├─ flashcards/build.ts  deck construction
│   ├─ progress/snapshot.ts progress shape + identity
│   ├─ animation/          timing, registry, periodic data for lesson animations
│   └─ hardware/            capture pipeline
├─ db/                  SQLite: schema, repositories, cache policy
├─ sync/                engine, push, pull, merge, policy
└─ constants/data/      bundled cold-start seed
docs/                   assignment documentation
```

## Documentation

| Document | Covers |
|---|---|
| [01-project-area.md](docs/01-project-area.md) | Index digit sum → area derivation **(needs your index number)** |
| [02-idea-and-features.md](docs/02-idea-and-features.md) | The idea, why it is worth building, feature list |
| [03-architecture.md](docs/03-architecture.md) | Layers, data flow, folder rationale |
| [04-offline-sync.md](docs/04-offline-sync.md) | Outbox, conflict strategies, viva demo script |
| [05-constraint-design.md](docs/05-constraint-design.md) | Four constrained-design policies + the algorithm |
| [06-hardware-integration.md](docs/06-hardware-integration.md) | Camera integration and why it was chosen |
| [07-ui-ux-flow.md](docs/07-ui-ux-flow.md) | Navigation, flows, rationale **(needs screenshots)** |
| [08-custom-components.md](docs/08-custom-components.md) | Props and events for each custom component |
| [09-animation-script.md](docs/09-animation-script.md) | Lesson animation system + scripts for all 16 animations |
| [decision-records/](docs/decision-records/) | The four decisions with the most consequence |
| [ai-log.md](docs/ai-log.md) | AI usage, failures, and how they were resolved |

## Requirement coverage

| Requirement | Implementation |
|---|---|
| Backend service | Firebase Auth + Firestore; security rules; in-app content publisher |
| Offline capability | SQLite source of truth + bundled cold-start seed |
| Sync on reconnect | Outbox + NetInfo-triggered drain, per-row backoff, dead letters, incremental pull |
| Conflict resolution | Per-entity: append-only / monotonic / set union / LWW — commutativity and idempotency asserted in tests |
| Constrained design | Adaptive selection algorithm; 40 MB LRU cache budget; network-aware sync policy; capture downscaling; constraint-solved responsive grid |
| Native hardware | Camera "Snap & Ask" wired through the offline queue |
| Custom components | `ExamCountdownRing` (SVG), `FlashcardDeck` (gesture), `AnswerSheetGrid` (OMR), `QuestionScanner` (camera), `AnimationPlayer` + 16 SVG lesson scenes |

## Before submitting

- [ ] Fill in your index number and verify the digit sum in [01-project-area.md](docs/01-project-area.md)
- [ ] Capture the screenshots listed in [07-ui-ux-flow.md](docs/07-ui-ux-flow.md)
- [ ] Confirm all image assets in `assets/` are your own work (plagiarism clause)
- [ ] Keep appending to [ai-log.md](docs/ai-log.md) as you continue
- [ ] Reconcile the SDK version note in `AGENTS.md` (says v57, project is SDK 54)
- [ ] Rehearse the offline demo and be ready to explain any file cold — there is a live coding defense
