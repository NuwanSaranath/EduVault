# 7. UI / UX Flow

> **⚠️ SCREENSHOTS NEEDED.** Capture each screen listed below and drop the images in
> `docs/screenshots/`, then replace the placeholders. This is a graded section — the
> brief asks for the UI/UX flow *with screenshots of the application*.

## Navigation structure

```
app/
├─ index.tsx                      splash → route by auth state
├─ (onboarding)/                  first-run introduction
├─ (auth)/
│   ├─ login · register · forgot-password
├─ (tabs)/                        ← SyncStatusBanner sits above this
│   ├─ index          Home        countdown ring, stats, quick actions, recommendations
│   ├─ subjects       Subjects    subject list with chapter progress
│   ├─ practice       Practice    quiz setup, daily challenge, leaderboard
│   ├─ progress       Progress    charts, Focus Next
│   └─ profile        Profile     account, achievements, settings entry
├─ subject/[id]                   chapter list
├─ theory/[chapterId]/            topic list + PDF
│   └─ [lessonId]                 lesson reader
├─ quiz/  index · session · result
├─ past-papers/ index
│   └─ [id]/ exam · result
├─ flashcards/index               swipe-to-grade deck
├─ planner/index                  weekly schedule
├─ ai-tutor/index                 chat + Snap & Ask
└─ profile/settings               sync, storage, preferences
```

**Tabs for the five destinations a student returns to; stack pushes for everything
task-shaped.** Sitting a past paper or running a quiz session is a task with a
beginning and an end, so those routes push over the tabs with `gestureEnabled: false`
— a back-swipe mid-exam would lose the attempt.

## Key flows

### Sitting a past paper

```
Past Papers → filter subject/year → tap paper
  → document sheet (MCQ / Structured / Marking Scheme / Start Exam Mode)
  → Exam Mode: countdown, AnswerSheetGrid + question list (two-way sync)
  → Submit (confirms if any are blank)
  → Result: score, weak areas, answer sheet replayed in review mode
```

The answer sheet and the scrolling question list stay in sync **both ways**: tapping a
bubble answers the question, tapping a row number scrolls the list to it. A student
can work either way round — sheet-first like the real exam, or question-first.

### Adaptive quiz

```
Practice → pick subject + question type → Start Quiz
  → selectAdaptiveQuestions() runs locally against attempt history
  → session (one question per screen)
  → Result: score, XP, badges unlocked
  → attempt written to SQLite + outbox in one transaction
```

### Snap & Ask

```
AI Tutor → camera button → full-screen QuestionScanner
  → permission requested on demand, with rationale
  → A4 framing guides → capture
  → downscaled to 1080px/60%, moved to durable storage, queued
  → chat shows the photo and an acknowledgement immediately, online or off
```

### Offline → online

```
[aeroplane mode on]  banner: "Offline — your work is saved on this device"
take quiz, add planner event, bookmark a lesson
                     banner: "Offline — 3 changes will sync"
[force-quit, reopen]  banner still shows 3 — the queue is durable
[aeroplane mode off]  banner: "Syncing…" → disappears
```

## UI/UX rationale

**One sync banner, above the tab navigator.** Connectivity is app-wide state, so one
mount point means one subscription rather than five. It collapses to zero height when
online with an empty outbox, so it costs nothing in the happy path — and it is tappable
to force a drain, which is the escape hatch for when the student knows they are back
online before the OS does.

**No network error states on content screens.** A consequence of the architecture
rather than a UI decision: content reads cannot fail for network reasons, so there is
nothing to show.

**Honest zeros.** Empty stats read `0%`, not a flattering placeholder. A student
deciding what to revise tonight needs their real numbers.

**Failures are visible, never silent.** Rows that exhaust their retries surface in
Settings with a manual retry. Silent discard is the only outcome worse than a visible
failure.

**Destructive actions name what survives.** "Clear cached lessons" says that bookmarks
and results are kept, because the student cannot otherwise know that the button is safe.

**Exam-hall fidelity.** The `AnswerSheetGrid` mirrors the physical OMR sheet so the
scanning motion practised on screen is the one used in the hall.

**Permissions on demand.** The camera prompt appears only when the student taps into the
scanner, never on mount.

## Screenshots

| Screen | Image |
|---|---|
| Onboarding | `![onboarding](screenshots/onboarding.png)` |
| Login / Register | `![login](screenshots/login.png)` |
| Home (countdown ring) | `![home](screenshots/home.png)` |
| Subjects | `![subjects](screenshots/subjects.png)` |
| Chapter list | `![chapters](screenshots/chapters.png)` |
| Lesson reader | `![lesson](screenshots/lesson.png)` |
| Practice / quiz setup | `![practice](screenshots/practice.png)` |
| Quiz session | `![quiz-session](screenshots/quiz-session.png)` |
| Quiz result | `![quiz-result](screenshots/quiz-result.png)` |
| **Flashcard deck mid-swipe** | `![flashcards](screenshots/flashcards.png)` |
| Past papers list | `![past-papers](screenshots/past-papers.png)` |
| **Exam mode with answer sheet** | `![exam](screenshots/exam.png)` |
| **Result with review-mode sheet** | `![paper-result](screenshots/paper-result.png)` |
| Progress + Focus Next | `![progress](screenshots/progress.png)` |
| AI Tutor chat | `![ai-tutor](screenshots/ai-tutor.png)` |
| **Snap & Ask viewfinder** | `![scanner](screenshots/scanner.png)` |
| Planner | `![planner](screenshots/planner.png)` |
| **Settings — Offline & Sync panel** | `![settings-sync](screenshots/settings-sync.png)` |
| **Offline banner with pending count** | `![offline-banner](screenshots/offline-banner.png)` |
| Dark mode (any screen) | `![dark-mode](screenshots/dark-mode.png)` |

The five in **bold** are the ones that evidence the graded requirements — custom
components, hardware integration, and offline sync. Capture those first.
