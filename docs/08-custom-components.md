# 8. Custom Components

Three components were built from primitives for this project, plus the camera
scanner. Each exists because the behaviour it needed was not available from a
library — and in each case the *reason* it was built is the reason it earns its place
in the app.

The shared components (`Card`, `Button`, `Input`, `Badge`, `ProgressBar`,
`SelectField`, …) are thin styled wrappers and are **not** claimed as custom work.

---

## 1. `ExamCountdownRing`

[src/components/ExamCountdownRing.tsx](../src/components/ExamCountdownRing.tsx) ·
used on the Home screen

A segmented countdown ring drawn from scratch in `react-native-svg`.

**Why built:** no chart library draws this, because it is not a progress bar bent into
a circle. Each of the 36 segments is an independently stroked arc, so the ring reads
as *discrete days ticking away* rather than a continuously filling bar. In a study app
that difference matters — a student glancing at it should feel a countdown, not a
completion metric.

### Properties

| Prop | Type | Default | Description |
|---|---|---|---|
| `daysRemaining` | `number` | — | Days left. Clamped at 0; negatives read as 0. |
| `totalDays` | `number` | — | Full sweep of the ring (length of the study plan). |
| `size` | `number` | `168` | Outer diameter in px. |
| `strokeWidth` | `number` | `14` | Ring thickness. |
| `segments` | `number` | `36` | Number of tick segments. |
| `segmentGap` | `number` | `2` | Gap between segments, in degrees. |
| `urgentThreshold` | `number` | `30` | Days at which the palette switches to urgent. |
| `label` | `string` | `'days to A/L'` | Caption under the numeral. |

### Events

| Event | Signature | When |
|---|---|---|
| `onPress` | `() => void` | Ring tapped. Omit to render non-interactive — the component drops the `Pressable` entirely rather than disabling it. |
| `onUrgent` | `(daysRemaining: number) => void` | Fires **once**, on the render where `daysRemaining` first crosses at or below `urgentThreshold`. Edge-triggered via a ref, so it does not re-fire on every render while the app sits in an urgent state. |

### How it works

1. `segments` arcs laid out around a circle, each spanning `360/segments − segmentGap` degrees.
2. Each arc is a `<Circle>` whose `strokeDasharray` exposes exactly one segment's worth of circumference and hides the rest — the standard way to draw an arc without building a path string.
3. `rotation` + `originX/originY` place it, so no per-segment trigonometry is needed.
4. Colour is interpolated per segment across the *lit* range, so the gradient always spans the visible arc regardless of how much is left. Two separate ramps: brand indigo→violet normally, amber→red once urgent. A single ramp through all four would spend most of the year looking vaguely alarming.
5. Starts at 12 o'clock (`−90°`) with a notch marking the fixed exam date.

The numerals are React Native `<Text>`, not SVG `<Text>` — they inherit font scaling
and dark-mode colours for free, which SVG text does not.

Deliberately **not animated**: it changes once a day, so a spring on mount would be
decoration that replays on every navigation back to Home.

---

## 2. `FlashcardDeck`

[src/components/FlashcardDeck.tsx](../src/components/FlashcardDeck.tsx) ·
used on the Flashcards screen

A swipeable, flippable card stack on `react-native-gesture-handler` + Reanimated.

**Why built:** the gesture *is* the pedagogy. Self-grading by swipe direction is what
feeds the adaptive algorithm — `onGrade` carries the topic id into the same weakness
signal quiz answers produce, so five minutes of flashcards measurably changes what the
next quiz asks. A generic carousel produces no grade at all.

### Properties

| Prop | Type | Default | Description |
|---|---|---|---|
| `cards` | `Flashcard[]` | — | `{ id, front, back, topicId? }`. Built from real questions, so `id` is a question id. |
| `swipeThreshold` | `number` | `110` | Horizontal px past which a release commits. |
| `velocityThreshold` | `number` | `800` | Release velocity (px/s) that commits regardless of distance. |
| `stackDepth` | `number` | `2` | Cards drawn behind the active one. |

### Events

| Event | Signature | When |
|---|---|---|
| `onGrade` | `(cardId, grade: 'known' \| 'review', topicId?) => void` | A swipe commits. Right → `known`, left → `review`. |
| `onDeckEmpty` | `(summary: { known, review }) => void` | The last card leaves the deck. |
| `onFlip` | `(cardId, face: 'front' \| 'back') => void` | A card is tapped to flip. |

### How it works

- Pan gesture drives `translateX` **on the UI thread** via Reanimated, so dragging stays at 60fps even while the JS thread is mid-database-write.
- Rotation is interpolated from x-offset (`±14°` across the screen width), which makes the card feel hinged at the wrist rather than sliding on glass.
- Vertical follow is damped to 25% — full tracking makes the card feel unmoored.
- Commit is **distance OR velocity**: a deliberate drag and a quick flick are both valid intents, and requiring distance alone makes rapid review tedious.
- `runOnJS` marshals the commit back to JS, because `onGrade` touches SQLite and cannot run in a worklet.
- The exit animation flings the card `width × 1.4` clear of the screen, then hands off in the completion callback — so the grade is recorded when the card has actually gone, not when the finger lifts.
- `Gesture.Exclusive(pan, tap)` with `tap.maxDistance(10)`: a tap only registers when the finger barely moved, so ending a drag cannot also flip the card. This is the specific bug that makes hand-rolled card stacks feel broken.
- A live colour overlay (green right / amber left) scales with drag distance, giving feedback *before* release.

---

## 3. `AnswerSheetGrid`

[src/components/AnswerSheetGrid.tsx](../src/components/AnswerSheetGrid.tsx) ·
used on the past-paper exam screen (answering) and result screen (review)

An OMR-style bubble sheet.

**Why built:** it is modelled on the physical MCQ sheet a Sri Lankan A/L candidate
fills in. The student practises on the same spatial layout they will meet in the exam
hall, so scanning "which ones have I left blank" is the same motion on paper and on
screen. A stack of standard radio groups trains the wrong habit.

It is also where the constrained-layout work is visible — see
[05-constraint-design.md](05-constraint-design.md#responsive--constrained-layout).

### Properties

| Prop | Type | Default | Description |
|---|---|---|---|
| `questionCount` | `number` | — | Questions on the paper. |
| `optionsPerQuestion` | `number` | `5` | Options, labelled `A` upward. |
| `answers` | `Record<number, string>` | — | 1-based question number → option letter. |
| `mode` | `'answering' \| 'review'` | `'answering'` | Review locks the sheet and colours against `correctAnswers`. |
| `correctAnswers` | `Record<number, string>` | — | Required in review mode. |
| `columns` | `number` | auto | Omit to fit automatically to screen width. |
| `focusedQuestion` | `number` | — | Highlights one row, e.g. the one the reader is scrolled to. |

### Events

| Event | Signature | When |
|---|---|---|
| `onAnswerChange` | `(questionNo, option) => void` | A bubble is filled. **Never fires in review mode** — the bubbles are `disabled`, because a graded paper that can still be edited invites accidental tampering. |
| `onQuestionFocus` | `(questionNo) => void` | A row is tapped outside its bubbles. The exam screen uses this to scroll the question list to that question. |

### Design notes

- **Column-major fill**, so questions read top-to-bottom then across — the way a printed sheet is laid out.
- **Review mode shows three states**, not two: the answer given, the answer that was correct, and (where they differ) both at once. Marking only "wrong" tells a student they failed without telling them what to learn.
- The component speaks **letters**; the exam screen holds answers keyed by question id and maps between them via `options.indexOf`. The letter-form sheet is snapshotted into `examStore` on submit so the result screen replays exactly what the student saw, rather than re-deriving it and risking disagreement.

---

## 4. `QuestionScanner`

[src/components/QuestionScanner.tsx](../src/components/QuestionScanner.tsx) ·
used by the AI Tutor — see [06-hardware-integration.md](06-hardware-integration.md)

`expo-camera` framed as a **document scanner** rather than a general camera: the
overlay guides are sized for a portrait A4 column, which is what an A/L paper looks
like. That framing is what justifies aggressive downscaling — legible text is the only
requirement.

### Properties & events

| Member | Type | Description |
|---|---|---|
| `onCapture` | `(image: ProcessedImage) => void` | Fired after capture, downscale and recompress. `ProcessedImage` carries `uri`, `width`, `height`, `bytes`, `savedBytes`. |
| `onCancel` | `() => void` | Backed out without capturing. |
| `hint` | `string` | Guidance line over the viewfinder. |

### Design notes

- **Permission is requested on demand, not on mount.** A permission dialog the student did not ask for reads as an intrusion in a study app. The prompt appears only when they tap into the scanner, and the rationale explains that photos stay on the device until they are online.
- `canAskAgain === false` gets a different message pointing at device settings, rather than a button that silently does nothing.
- A `busy` guard means a double-tap cannot queue two captures.
- Captured at `quality: 1` then downscaled once — letting the camera compress first would mean compressing twice and losing text legibility.
