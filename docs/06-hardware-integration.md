# 6. Native Hardware Integration

## Chosen sensor: camera — "Snap & Ask"

A student photographs a printed question from a past paper or textbook and asks the AI
Tutor about it.

### Why the camera, and why this feature

The camera was chosen over GPS or the gyroscope because it is the only one with an
honest use in exam preparation. A student stuck on a printed question has the question
in front of them on paper, and typing out a physics problem with subscripts and a
diagram is slower than the problem is worth. Photographing it is the natural action.

It also earns its place architecturally: an image payload is the **hardest case for the
offline queue**. A text mutation is a few hundred bytes; a photo is megabytes and must
survive a session, be gated off metered connections, and be cleaned up after upload.
Wiring the camera through the outbox exercises parts of the sync design that text
alone never would.

The gyroscope was deliberately rejected — forcing it in would read as box-ticking.

## Flow

```
AI Tutor screen
  → camera button opens QuestionScanner in a full-screen Modal
      → useCameraPermissions()      permission requested on demand
      → CameraView with A4 framing guides
      → takePictureAsync({ quality: 1 })
  → processCapture()                 resize 1080px, JPEG 60%
  → submitScannedQuestion()
      → persistCapture()             cache dir → document dir (durable)
      → enqueue({ entity: 'tutorQuestion', mediaUri })
  → chat shows the photo + an acknowledgement, immediately, online or off
  → sync engine pushes it when syncPlan permits media
```

## Modules and APIs used

| Module | Used for | SDK 54 note |
|---|---|---|
| `expo-camera` | `CameraView`, `useCameraPermissions`, `takePictureAsync` | — |
| `expo-image-manipulator` | Downscale + recompress | Uses the **new** chainable `ImageManipulator.manipulate(uri).resize(…).renderAsync()` → `saveAsync()`. `manipulateAsync` is deprecated in SDK 54. |
| `expo-file-system` | Move captures somewhere durable | Uses the **new** `File` / `Directory` / `Paths` classes. The legacy `*Async` functions throw if called from the main export and are only available from `expo-file-system/legacy`. |

Both API changes were checked against the versioned SDK 54 docs rather than assumed —
see [ai-log.md](ai-log.md#3-sdk-54-api-drift-in-file-system-and-image-manipulator).

## Permissions

`app.json` gets the camera permission via the `expo-camera` config plugin. Requested
**on demand**, not on mount: a permission dialog the student did not ask for reads as
an intrusion in a study app. The rationale text states that photos stay on the device
until they are online, which is literally true — the outbox holds them.

`canAskAgain === false` shows a different message pointing at device settings, rather
than a button that silently does nothing.

## Why the photo survives

Two failure modes are handled explicitly:

1. **Cache clearing.** Both the camera and `saveAsync` write to the cache directory, which Android may clear at any time. An outbox row outlives the session, so `persistCapture` copies the file into `Paths.document/captures/` before enqueuing. Without this, a photo taken offline on Monday could be an empty reference by Tuesday.

2. **Metered upload.** The outbox row is marked `needs_media = 1`, so `syncPlan` excludes it from the batch on cellular with Data Saver on — while every text mutation queued behind it still flushes. The photo waits for Wi-Fi.

Pending capture bytes are shown in Settings → Offline & Sync, so the cost is visible
rather than silent.

## Secondary sensor

`expo-location` is installed and available for study-session location tagging ("you
score higher at the library than at home"). It is **not wired into a screen** — the
camera is the integration being claimed, and adding a half-used second sensor would
weaken rather than strengthen the submission. Stated here explicitly rather than left
as an unexplained dependency.
