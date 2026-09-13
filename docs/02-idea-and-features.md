# 2. Project Idea & Features

## EduVault

An offline-first A/L (Advanced Level) exam-preparation app for Sri Lankan students.

## The problem

A/L candidates study in the places they can, not the places with Wi-Fi: on buses, in
classrooms, at home on prepaid data they are rationing. Most exam-prep apps treat a
connection as a precondition and degrade to a spinner in exactly those moments — which
are most of a student's available study time.

Two further problems compound it:

- **Undirected practice.** A question bank with a "Start Quiz" button serves random questions, so most of a session re-tests what the student already knows. Their scarcest resource is time, and random selection wastes it.
- **Format mismatch.** Students practise on screens laid out like web forms, then sit an exam filling in an OMR bubble sheet under time pressure.

## What makes it worth building

EduVault treats **offline as the normal case rather than the failure case**. This is a
design stance with consequences throughout the app, not a feature bullet:

- Content is read from a local SQLite database, so no content screen has a network error state at all.
- Quiz selection runs an **on-device** adaptive algorithm, so personalisation works identically offline — a server-side recommender could not.
- Past papers are marked locally, so the most stressful moment in the app never depends on signal.
- Every result queues in a durable outbox and syncs when a connection appears, with per-entity conflict rules so two devices never lose progress.

The aeroplane-mode demo in [04-offline-sync.md](04-offline-sync.md#8-demo-script-for-the-viva)
is the shortest statement of the whole idea: take a quiz with no connection, force-quit,
reopen, reconnect, and watch it land in Firestore.

## Features

### Learning

| Feature | Notes |
|---|---|
| Subject → chapter → lesson browser | Guided-teaching content: intro, why it matters, real-life examples, memory tricks, common mistakes, exam tips |
| Lesson reader with derived tabs | Tabs appear only for content the lesson actually has, so simple lessons stay simple |
| Bookmarks | Also act as **cache pins** — a bookmarked lesson is never evicted by the storage budget |
| Sinhala explanations | Toggleable alongside English in the AI Tutor |
| Chapter PDF download & viewer | Offline document access |

### Practice

| Feature | Notes |
|---|---|
| **Adaptive quizzes** | `weakness × staleness × difficulty`, 70/30 focus/explore split |
| **Flashcard deck** | Swipe-to-grade; cards are built *from* real questions so grades feed the same adaptive signal |
| **Timed past papers** | Local marking, OMR answer sheet, weak-area breakdown |
| Daily challenge | Deliberately random, not adaptive — its job is variety and streak-keeping |
| Review mode | Replays the submitted sheet showing answer given vs. correct answer |

### Support

| Feature | Notes |
|---|---|
| **AI Tutor** | Local knowledge base answers instantly, offline. Unmatched questions queue for the backend rather than dead-ending |
| **Snap & Ask** (camera) | Photograph a printed question; downscaled at capture, queued, deferred to Wi-Fi |
| Study planner | Weekly schedule with OS notification reminders |
| Progress & analytics | Charts, plus a "Focus Next" card driven by the same ranking the quiz uses |
| Gamification | XP, levels, streaks, badges — with monotonic sync so no device loses XP |

### Platform

| Feature | Notes |
|---|---|
| **Offline-first** | SQLite source of truth, bundled cold-start seed, outbox sync |
| **Sync status UI** | Banner + full Settings panel; dead letters surfaced with manual retry |
| **Data Saver** | User-facing switch: results sync on cellular, photos wait for Wi-Fi |
| **Storage budget** | 40 MB cap, LRU eviction, bookmarks pinned, usage shown in Settings |
| Firebase Auth | Session persisted, so a signed-in student stays signed in offline indefinitely |
| Dark mode | System / light / dark |

## What is deliberately online-only

Stated explicitly because the honesty is part of the design:

- **Sign-in.** There is no way to verify a password offline without trusting a cached credential. Instead the *session* is persisted — only a new login on a new device needs a connection.
- **Leaderboard.** A ranking against other students is meaningless without them, so an empty state is the correct answer rather than a stale cached board.
