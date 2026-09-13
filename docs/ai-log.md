# AI Usage, Decision & Failure Log

Required by the assignment: prompts used, failures hit, and how they were resolved.

**Append to this as you work.** It is the one document that cannot be reconstructed at
the end. Each entry below is a real failure from the implementation of the offline/sync
layer, not a reconstruction.

---

## Session 1 — 2026-09-12 · Backend, offline sync, hardware, custom components

### Prompt used

> *(Paraphrased — the full exchange is in the session transcript.)*
>
> 1. "According to this assignment what should I add for this application" — asked for a gap analysis of the existing codebase against the SE5070 brief.
> 2. "What are the possible solutions for this, give the idea for gap with example" — asked for concrete solutions per gap with code examples.
> 3. "Implement this" — asked for the full implementation.

### Starting state

A complete, polished front end: 24 routes, 13 shared components, 8 AsyncStorage-backed
Zustand stores. But **every service was mocked** — `src/services/api/client.ts`
contained a `simulateRequest` that resolved hardcoded data after a `setTimeout`.
`login()` accepted any credentials and fabricated a user. There was no backend, no
connectivity detection, no mutation queue, and no hardware integration.

### What was built

- SQLite layer: schema + migrations, 6 repositories, outbox table, LRU cache policy
- Firebase Auth + Firestore; security rules; in-app content publisher
- Sync engine: NetInfo listener, outbox drain, per-row backoff, dead letters, incremental pull
- Per-entity conflict resolution (append-only / monotonic / set union / LWW)
- Adaptive question selection algorithm (weakness × staleness × difficulty)
- Camera "Snap & Ask" with a capture-downscaling pipeline
- Three custom components: `ExamCountdownRing`, `FlashcardDeck`, `AnswerSheetGrid`
- 60 unit tests across 4 suites

**Verification:** `npx tsc --noEmit` → 0 errors · `npx jest` → 60 passed ·
`npx expo export --platform android` → bundles clean (7.29 MB Hermes bytecode).

---

## Failures and errors encountered

### 1. `npm install firebase` refused with ERESOLVE

```
npm error ERESOLVE could not resolve
npm error While resolving: react-dom@19.3.0
npm error Found: react@19.1.0
npm error Could not resolve dependency:
npm error peer react@"^19.3.0" from react-dom@19.3.0
```

**Diagnosis:** nothing to do with Firebase. The project already had `react-dom@19.3.0`
installed while `react` is pinned at `19.1.0` by Expo SDK 54. The new install simply
made npm re-evaluate the whole tree and surface a pre-existing conflict.

**Fix:** `npm install firebase --legacy-peer-deps`.

**Lesson:** read which packages the error names. Assuming the package being installed
is the culprit would have led to trying older Firebase versions, none of which would
have helped.

---

### 2. TypeScript module augmentation silently deleted every `firebase/auth` export

`getReactNativePersistence` exists at runtime (it is in @firebase/auth's
`react-native` entry point) but is absent from the published `firebase/auth` types. A
declaration file was added to augment it:

```ts
// ✗ BROKEN — src/types/firebase-auth-rn.d.ts
declare module 'firebase/auth' {
  import type { Persistence } from 'firebase/auth';
  export function getReactNativePersistence(storage: …): Persistence;
}
```

Result — **10 new errors**, and not the ones expected:

```
src/services/firebase.ts(3,3): error TS2305: Module '"firebase/auth"' has no exported member 'getAuth'.
src/services/firebase.ts(4,3): error TS2305: Module '"firebase/auth"' has no exported member 'initializeAuth'.
src/services/auth.ts(2,3):    error TS2305: Module '"firebase/auth"' has no exported member 'createUserWithEmailAndPassword'.
…
```

**Diagnosis:** a `.d.ts` file with no **top-level** import or export is a *global*
script, so `declare module 'x'` declares an **ambient module** that *replaces* the real
one instead of augmenting it. Every genuine export vanished. The `import type` was
inside the module block, which does not count.

**Fix:** move the import to the top level, which makes the file a module and turns the
declaration into a true augmentation:

```ts
// ✓ WORKS
import type { Persistence } from 'firebase/auth';   // ← load-bearing

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: …): Persistence;
}
```

Errors went 10 → 3. The comment in that file records why the import cannot be removed.

---

### 3. SDK 54 API drift in `expo-file-system` and `expo-image-manipulator`

The first version of the capture pipeline was written from memory using the familiar
APIs:

```ts
// ✗ Both of these are wrong for SDK 54
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

await FileSystem.getInfoAsync(uri, { size: true });
await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1080 } }], …);
```

This **type-checks and bundles**, then throws at runtime. Checking the versioned SDK 54
docs (as `AGENTS.md` requires) showed:

- `expo-file-system` replaced the `*Async` functions with `File` / `Directory` / `Paths` classes. The legacy functions *throw if called from the main export* and are only importable from `expo-file-system/legacy`.
- `manipulateAsync` is deprecated in favour of a chainable context: `ImageManipulator.manipulate(uri).resize({width, height: null})` → `renderAsync()` → `saveAsync({format, compress})`.

**Fix:** rewrote `imagePipeline.ts` against the real APIs, verified by reading the
installed `.d.ts` files as well as the docs.

**Lesson — the important one in this log:** a wrong-but-plausible API passes both
`tsc` and the bundler, because the module exists and the property access is untyped
until it runs. Type-checking clean is not evidence that an SDK call is correct. Every
new native module in this session had its `.d.ts` read before use afterwards.

---

### 4. A test suite failed on a native module it had no business loading

```
FAIL src/sync/__tests__/merge.test.ts
  ● Test suite failed to run
    Cannot find module 'expo-asset' from 'node_modules/expo-sqlite/build/hooks.js'
    Require stack:
      node_modules/expo-sqlite/build/hooks.js
      src/db/index.ts
      src/db/repositories/progressRepo.ts
      src/sync/__tests__/merge.test.ts
```

36 tests passed; this one suite could not even load.

**Diagnosis:** `merge.test.ts` imported the `ProgressSnapshot` *type* from
`progressRepo`, which imports `src/db/index.ts`, which imports `expo-sqlite`. A
type-only need pulled in the entire native persistence stack.

**The tempting fix** was `npx expo install expo-asset` to satisfy the missing
dependency. That would have worked and been wrong — it treats a layering problem as a
packaging problem.

**Actual fix:** extracted the type and its identity value into
`src/features/progress/snapshot.ts`, a pure module with no imports. `progressRepo`
re-exports them for convenience; `merge.ts` and the tests import from the pure module.

The failing test was a **correct signal about the architecture**: pure merge logic
should not be able to reach a database. Fixing the layering rather than the symptom
also made the whole suite run in ~3 seconds.

---

### 5. Stale generated route types rejected a route that exists

After adding `app/flashcards/index.tsx`:

```
src/screens/home/HomeScreen.tsx(166,50): error TS2345:
  Type '"/flashcards"' is not assignable to parameter of type
  'RelativePathString | … | "/(auth)/forgot-password" | … 107 more …'
```

**Diagnosis:** `experiments.typedRoutes` is on, so `router.push` accepts only routes
listed in the **generated** `.expo/types/router.d.ts`. That file was last written on
9 August and knew nothing about the new route.

**Wrong fix considered:** casting the path to `never` or `as any`. That would silence a
mechanism whose entire purpose is catching typos in route strings.

**Fix:** regenerated the types by briefly starting the dev server. Typegen ran after
~33s (it writes the file even when the server itself declines to bind a port), and the
error cleared.

---

### 6. Nine screens were bypassing the database entirely

After the services were rewired, `tsc` reported 0 errors — but a grep showed:

```
$ grep -rn "from '@/constants/data" src/screens/
src/screens/home/HomeScreen.tsx:7:        import { lessons } from '@/constants/data/chapters';
src/screens/subjects/SubjectsScreen.tsx:5: import { getChaptersBySubject } from …
src/screens/theory/TheoryLessonScreen.tsx:9: import { getQuestionsByIds } from …
… 9 files total
```

**Why this mattered more than any type error:** those screens read the *bundled*
content directly. The architecture claim — "SQLite is the source of truth" — would
have been false in the place it is most visible. Content pulled from Firestore would
never have appeared, and `last_read_at` would never have been stamped, so the LRU cache
budget would have evicted at random.

**Fix:** converted all nine to `useAsyncData` over the service layer, and extracted a
shared `useStreamSubjects` hook because five of them needed the same query.

**Lesson:** a green type-check says the code is consistent, not that it is correct.
Architectural violations are invisible to `tsc` — grepping for the old import path was
what actually found them.

---

### 7. Smaller issues

| Issue | Resolution |
|---|---|
| `jest-expo` installed at `57.0.5` — wrong SDK | Pinned to `~54.0.0` to match `expo@54.0.36`. |
| `gradePastPaper` became async (reads SQLite) | Two screens broke; `tsc` caught both. Marked fire-and-forget calls `void submitExam()` so the intent is explicit rather than an ignored promise. |
| `computeSubjectProgress` gained a 4th argument | `ProgressScreen` was fetching chapter stats inside its render loop — moved to a single batched `useAsyncData` pass. |
| `react-native-chart-kit` throws on an empty dataset | Data now arrives asynchronously, so the chart is guarded with an empty state instead of rendering with `[]`. |
| Home screen showed hardcoded fallbacks (`78`, `62`, `/9`) | Replaced with real zeros and a SQLite-derived lesson total. A flattering placeholder is worse than an honest zero for a student deciding what to revise. |
| Bash heredocs failed writing three repository files | Switched to the editor tooling for those files. Tooling friction, not a code defect — noted for completeness. |

---

## Open item

`AGENTS.md` instructs reading `https://docs.expo.dev/versions/v57.0.0/`, but
`package.json` resolves `expo@54.0.36`. All API verification in this session used the
**v54** docs, matching what is installed. Reconcile before adding further SDK
packages — following the v57 docs against an SDK 54 install is how failure #3 happens
again.
