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

---

## Session 2 — 2026-09-13 · Lesson animations

### Prompt used

> "I want to show animation for practical and other necessary places then student
> can get good idea about lesson. Read this lesson and generate complete script
> for animation, how to show animation etc."

Target content: `src/constants/data/lessons/chemistryAtomicStructure.ts` — 1078
lines, seven lessons, Sinhala, covering NIE Grade 12 Chemistry Unit 1.

### What was built

A lesson animation system plus six scenes, all live under a new **සජීවීකරණ** tab
in the lesson reader. Full write-up in
[09-animation-script.md](09-animation-script.md).

- `features/animation/` — pure timing helpers, scene types, shared palette, registry
- `components/animations/` — `AnimationPlayer` (clock, transport, scrubber, captions) and six SVG scenes
- Three **practicals**: cathode ray tube, Millikan oil drop, Rutherford gold foil
- Three **concepts**: isotope builder, energy quantisation, hydrogen spectrum
- 48 new tests (108 total)

**Verification:** `tsc --noEmit` → 0 errors · `jest` → 108 passed ·
`expo export --platform android` → bundles clean (7.38 MB, +90 KB).

### Design decisions worth defending

**A scene is a pure function of elapsed time.** No state accumulates between
frames. This single rule is what makes scrubbing, stage-stepping, caption sync
and reduce-motion fall out for free, and it makes the timing layer unit-testable
without mounting a component.

**The clock is in JavaScript, not Reanimated** — the only animation in the app
that is. A teaching animation must keep a Sinhala caption in lockstep with the
drawing, and captions are React state, so a UI-thread clock would need `runOnJS`
at every stage boundary anyway. Capped at 30fps and stopped entirely when paused,
finished, off-tab, or reduce-motion is on.

**Sinhala labels are RN `<Text>`, not SVG `<Text>`.** Complex-script shaping is
handled by the platform text engine but historically unreliable inside
`react-native-svg` on Android. RN text also inherits font scaling and dark-mode
colour for free.

**The physics is computed, not hand-drawn.** Rutherford deflection comes from
`θ = 2·arctan(k/b)`, so "smaller impact parameter → larger deflection" *emerges*
rather than being scripted per particle. Hydrogen line positions come from
`Eₙ = −1312/n²`, so a student can check them against their textbook.

### Failures encountered

**1. Shell mangled backticks inside a Node `-e` string.** Writing the JSX panel
through `node -e "…"` with a template literal produced
`bash: line 46: active\: No such file or directory`, and the inserted comment came
out as `{/*  is bound to the tab…` — the backticked identifier silently deleted.
Fixed with the editor tooling. **Lesson:** never pass code containing backticks
through a double-quoted shell string; the failure is silent corruption, not an
error.

**2. Referenced two variables that did not exist.** The inserted panel used
`animationScenes` and `isDark`, neither defined in `TheoryLessonScreen`. Caught
immediately by `tsc` (`Cannot find name 'lessonAnimations'`). Added
`useColorScheme` and a memoised `scenesForLesson(lesson?.animationIds)`. Renamed
the local to `lessonAnimations` to avoid shadowing the registry export.

**3. A registry test that exists because of an invisible failure mode.** Stage
timings are hand-written numbers. A stage whose `at` exceeds the scene `duration`
is simply never reached — the student never sees that step and **nothing errors**.
`registry.test.ts` asserts stages start at 0, increase strictly, stay inside
`duration`, and leave the last stage ≥ 1.2s to be read. It also asserts every
practical ends with a stated conclusion, since an experiment animation that never
says what was concluded is decoration.

### Open item

Ten of sixteen animations are scripted but not built (Part C of
[09-animation-script.md](09-animation-script.md)), including the positive-ray
comparison that the cathode ray tube's final stage points at. Scripts are written
so implementation does not require re-deriving the teaching intent.

---

## Session 3 — 2026-09-13 · The remaining ten animations

### Prompt used

> "E:\PROJECTS\EduVault\EduVault\docs\09-animation-script.md using this md file
> design animation and show them in app"

i.e. implement Part C of the animation script — the ten animations that had been
scripted but not built — and wire them into the reader.

### What was built

All ten, taking the catalogue from 6 to **16**:

| § | Animation | Kind |
|---|---|---|
| 1.1 | පරමාණුවේ පරිමාණය (atom scale zoom) | concept |
| 1.1.3 | ධන කිරණවල ගුණ (positive rays) | **practical** |
| 1.2 | EM වර්ණාවලිය | concept |
| 1.2 | ද බ්‍රොග්ලි සම්බන්ධය | concept |
| 1.3.2 | කාක්ෂිකවල හැඩ (orbital shapes) | concept |
| 1.3.3 | ක්වොන්ටම් අංක ගස් සටහන | concept |
| 1.3 | අනුක්‍රමික අයනීකරණ ශක්ති | concept |
| 1.4 | ඉලෙක්ට්‍රෝන විනයාස පිරවීම | concept |
| 1.5 | ආවර්තිතා වගුව ගොඩනැගීම | concept |
| 1.6 | ආවර්තීය නැඹුරුතා | concept |

Plus `features/animation/periodicTable.ts` — shared element data (positions,
radii, ionisation energies, electronegativities, electron affinities, Aufbau
anomalies) used by the two table scenes, so an element occupies the same cell in
both. Lessons 1.4, 1.5 and 1.6 gained a සජීවීකරණ tab for the first time.

**Verification:** `tsc --noEmit` → 0 errors · `jest` → 131 passed (23 new) ·
`expo export --platform android` → bundles clean (7.49 MB, +110 KB).

### Design decisions worth defending

**Data over drawing, wherever a quantity is shown.** Positive-ray deflection is
log-scaled from real e/m values; the de Broglie wavelengths are drawn at one
shared metres-per-pixel scale; periodic trends use real radii and ionisation
energies. Nothing is eyeballed to look right, so the physics survives a viva
question about it.

**Hund's rule is implemented, not tabulated.** `occupancyOf(electrons, boxes)`
fills singly before pairing, so the boxes are populated the way a student derives
them rather than from a per-element lookup. Same reasoning as the quantum tree,
which generates its branches from `l = 0…n−1` and `mₗ = −l…+l`.

**Four trends on one table, swapped in place.** The table never moves between
stages of the periodic-trends scene, so the student sees radius shrinking toward
the top right and then ionisation energy growing toward the same corner. Four
separate diagrams cannot force that comparison — which is the entire point, since
all four trends come from one cause.

**Empty cells stay empty.** Noble gases have no electronegativity and group 2 no
useful electron affinity. Those cells are left blank rather than filled with a
plausible-looking value; the gaps are real chemistry and are examinable.

**Teaching by rejection, twice.** The Aufbau scene shows 2p² crammed into one box
and strikes it through in red before showing the correct arrangement, mirroring
the failed step already used in the quantisation scene. A rule shown being broken
sticks better than a correct example.

### Failures encountered

**1. A test caught a real chemistry special case — and the test was wrong.**

```
● element table › assigns blocks to the right groups
  Expected: <= 2
  Received:    18
```

The new `periodicTable.test.ts` asserted that every s-block element sits in group
1 or 2. Helium is 1s² — genuinely s-block — but is drawn in group 18 with the
other noble gases. The data was right; the assertion was too broad.

What makes this worth recording: **the very next test in the same file already
asserted helium's behaviour as correct.** Two assertions about the same fact,
written minutes apart, contradicted each other. Fixed by exempting He from the
general rule and pointing the comment at the specific test that covers it.

**2. The reason these tests exist at all.** A mistyped radius or ionisation energy
does not crash anything — it silently draws the wrong science, and a student
would see chlorine drawn larger than sodium with no way to know the app was wrong
rather than their understanding. So the tests encode the *trends* (radius
decreases across a period, ionisation energy runs opposite to radius,
electronegativity peaks at fluorine) rather than spot-checking values. That is the
only form of the test that would have caught a plausible-looking typo.

**3. Shell backtick corruption, again — avoided this time.** Session 2 lost a
code comment to backticks inside a `node -e "…"` string. This session's content
edit needed regexes and a nested data structure, so it went into a scratchpad
`.js` file run with `node path/to/script.js` instead. No quoting layer, no
corruption. Recording it because the earlier lesson only paid off by changing the
approach rather than by being more careful with the same one.

### Result

Every lesson from 1.1 to 1.6 now has a සජීවීකරණ tab. Roughly six minutes of
animation covering all four syllabus practicals and twelve concept
visualisations, all offline, all driven by the same pure-function-of-time engine.
