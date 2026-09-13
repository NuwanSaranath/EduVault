# 1. Project Area Derivation

## Rule

> Take your index number, add all its digits (digit sum), take the result modulus 5.
> The remainder is the assigned project area.

| Remainder | Area |
|---|---|
| 0 | **EdTech** |
| 1 | Entertainment |
| 2 | Sustainability & GreenTech |
| 3 | Artificial Intelligence |
| 4 | HealthTech |

## Calculation

> **⚠️ FILL THIS IN BEFORE SUBMITTING.** The digits below are placeholders. Substitute
> your own index number and verify the remainder is **0**. EduVault is an EdTech
> project — if your index number yields a different remainder, this is the wrong
> project and no amount of implementation quality will recover the marks.

Index number: `MS_____________`

```
Digit sum  = d₁ + d₂ + d₃ + … + dₙ
           = _____
Remainder  = _____ mod 5
           = 0
```

**Assigned area: 0 → EdTech**

## Why this project fits the area

EduVault is an A/L (Advanced Level) exam-preparation app for Sri Lankan students. It
sits squarely in EdTech: the entire product is syllabus content, practice, and
measurement of a student's own progress against an exam date.

It is worth building rather than a generic quiz app for one specific reason — the
target user frequently has no usable connection. Students revise on buses, in
classrooms with no Wi-Fi, and on prepaid data they are rationing. Most exam-prep
apps degrade to a spinner in exactly those moments. EduVault treats offline as the
normal case rather than the failure case: content is read from a local database,
quizzes are selected by an on-device algorithm, papers are marked locally, and
results queue for sync. Everything that matters works with the aeroplane-mode
switch on.
