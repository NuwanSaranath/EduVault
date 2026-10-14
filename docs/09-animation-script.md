# 9. Lesson Animation Script

Complete script for the animations in **Chemistry Unit 1 — පරමාණුක ව්‍යුහය
(Atomic Structure)**: how the system shows an animation, and the scene-by-scene
script for each of the sixteen.

**All sixteen are built and live in the app.**

---

## Part A — How an animation is shown

### A.1 The one rule

> **A scene is a pure function of elapsed time `t`.**

Nothing accumulates between frames. Given `t = 12.5`, a scene draws exactly one
picture — the same picture, every time, on every device.

That single constraint is what buys everything a *teaching* animation needs:

| Capability | Why the rule gives it |
|---|---|
| Scrub to any moment | Seeking to 12.5s is just rendering at 12.5 |
| Step forward / back by stage | Set `t` to the stage's start time |
| Caption always matches the picture | Both derive from the same `t` in one render |
| Reduce-motion support | Render once at a late `t` — full diagram, zero movement |
| Unit-testable timing | Pure helpers, no clock, no mounted component |

### A.2 Pieces

```
src/features/animation/
├─ timing.ts          pure helpers: segment, easing, stages, seeded RNG   ← tested
├─ types.ts           SceneProps, AnimationScene, Stage
├─ colors.ts          one particle palette for every scene, per theme
├─ periodicTable.ts   elements, radii, ionisation, electronegativity      ← tested
└─ registry.ts        id → scene + stage script                           ← tested

src/components/animations/
├─ AnimationPlayer.tsx   clock, transport, scrubber, captions
├─ SceneLabel.tsx        Sinhala text positioned over the canvas
└─ scenes/               the sixteen drawings
```

Lessons reference scenes **by id**, so content stays data:

```ts
// src/constants/data/lessons/chemistryAtomicStructure.ts
{
  sectionNumber: '1.1',
  animationIds: [
    'anim-atom-scale',
    'anim-cathode-ray-tube',
    'anim-millikan-oil-drop',
    'anim-positive-rays',
    'anim-rutherford-gold-foil',
    'anim-isotopes',
  ],
  …
}
```

A lesson pulled from Firestore names an animation exactly as a bundled one does.
Unknown ids are skipped, so content can name an animation before it is built.

### A.3 Where the student sees it

`TheoryLessonScreen` grows a **සජීවීකරණ (Animations)** tab, and only for lessons
whose ids actually resolve to built scenes — an empty tab is worse than no tab.

```
Subjects → Chemistry → Unit 1 → 1.1 පදාර්ථය පිළිබඳ පරමාණුකවාදය
  → tab: සජීවීකරණ
      ┌───────────────────────────────────────┐
      │ [පරීක්ෂණය] 1.1.4  රදර්ෆෝඩ්ගේ රන්පත්...  │
      │ purpose line                           │
      │ ┌───────────────────────────────────┐ │
      │ │          SVG canvas               │ │
      │ └───────────────────────────────────┘ │
      │ ▬▬▬▬▬▬▬|▬▬▬|▬▬▬▬|▬▬▬▬   ← ticks = stages│
      │      ⏮   ▶   ⏭   ↻                    │
      │ [1.උපකරණය][2.නිරීක්ෂණය 1][3....]      │
      │ ── caption ─────────────────────────  │
      │ 💡 නිගමනය: …                          │
      └───────────────────────────────────────┘
```

Controls, and why each exists:

| Control | Behaviour | Reason |
|---|---|---|
| ▶ / ⏸ | Play, pause; ↻ at the end | Stops at the end rather than looping — a looping diagram reads as decoration |
| ⏮ | Restart current stage, or jump back one if only just inside it | Same grace behaviour as a music player's previous-track button |
| ⏭ | Jump to next stage start | Lets a student skip what they already understand |
| Scrubber | Drag to any moment; pauses on touch | Someone who scrubs to a moment wants to *look* at it |
| Stage chips | Tap to jump straight to a step | Revision is non-linear — "show me observation 3 again" |
| 💡 takeaway | Highlighted under the caption | The exam-relevant sentence must not be buried in narration |

### A.4 The clock, and why it is in JavaScript

Every other animation in this app runs on the UI thread via Reanimated. This one
does not, deliberately.

A teaching animation must keep a **Sinhala caption in lockstep with the drawing**
— the caption is the teaching, the drawing is the evidence. Captions are React
state, so a UI-thread clock would need `runOnJS` at every stage boundary anyway,
giving up the isolation that makes UI-thread animation worthwhile while adding
worklet complexity.

Driving `t` from JS makes the caption, the highlighted chip, the scrubber and the
drawing all derive from one number in one render. They *cannot* drift apart,
because there is nothing to drift.

**Cost, bounded deliberately** (part of the constrained-design story in
[05-constraint-design.md](05-constraint-design.md)):

- Frame cap at **30 fps** — smooth to the eye for a few dozen SVG nodes, roughly half the wake-ups of a 60 fps loop on the mid-range Android this app targets.
- Clock stops completely when: paused, finished, tab switched away (`active={false}`), or reduce-motion is on.
- No `setInterval` anywhere — `requestAnimationFrame` with an elapsed-time check, so the clock stays accurate when a frame is late.

### A.5 Sinhala text is not SVG text

Labels are React Native `<Text>` positioned over the canvas
([SceneLabel.tsx](../src/components/animations/SceneLabel.tsx)), not `<Text>`
from `react-native-svg`.

Sinhala is a complex script — consonant conjuncts, vowel signs attaching on both
sides of a base glyph. The platform text engine handles this; `react-native-svg`
on Android historically does not. RN text also inherits theme colours and font
scaling for free. The cost is that labels are positioned in the same pixel space
as the drawing rather than inside the viewBox, which is a fair trade.

### A.6 Colour is part of the teaching

One palette, in [colors.ts](../src/features/animation/colors.ts), used by every
scene:

| | Colour | Meaning |
|---|---|---|
| 🔴 | red | proton (+) |
| ⚪ | grey | neutron (0) |
| 🔵 | blue | electron (−) |
| 🟠 | orange | nucleus |
| 🟡 | amber | α particle / beam |

A proton is red in *every* animation. If the isotope scene and the Rutherford
scene coloured particles differently, a student would re-learn the key each time
and the two diagrams could not be compared. Consistency is not styling here.

### A.7 Real numbers, not drawn approximations

Where a scene shows a quantity, it computes it:

| Scene | Computed from |
|---|---|
| Rutherford | `θ = 2·arctan(k/b)` — the Rutherford scattering relation |
| Hydrogen spectrum | `Eₙ = −1312/n²`, line positions from ΔE |
| de Broglie | `λ = h/mv`, both objects at one metres-per-pixel scale |
| Atom scale | magnification 1 → 10⁵ with the true 10⁵ size ratio held throughout |
| Positive rays | deflection ∝ log(e/m) from real e/m values |
| Periodic trends | real radii, ionisation energies, electronegativities |
| Aufbau | Hund's rule implemented, not tabulated per element |

This matters for the viva: a student can be asked to change a constant and say
what happens, and the answer is in the code rather than in a hand-drawn path.

---

## Part B — The sixteen animations

Section numbers match the syllabus. ⭐ marks the two most examined.

---

### B.1 `anim-atom-scale` — පරමාණුවේ පරිමාණය

**§1.1 · සංකල්පය · 17s ·** [AtomScale.tsx](../src/components/animations/scenes/AtomScale.tsx)

**Why animated:** a side-by-side drawing cannot work, because the nucleus at true
scale is smaller than one pixel — which *is* the point being made.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | පිටිය = පරමාණුව | Cricket stadium, ⌀ ≈ 10⁻¹⁰ m | — |
| 2 | 3 | විශාලනය ඇරඹේ | Zoom starts; magnification readout ticks ×10¹, ×10²… | — |
| 3 | 6 | හිස් අවකාශය | Stadium already off-canvas, nucleus still invisible. Dust streams past | — |
| 4 | 12 | බෝලය = න්‍යෂ්ටිය | Cricket ball resolves, ⌀ ≈ 10⁻¹⁵ m | — |
| 5 | 14 | අනුපාතය | Ratio ~10⁵ stated | පදාර්ථය සැබැවින්ම බොහෝ දුරට හිස් අවකාශයකි |

**Detail:** dust specks sit at *logarithmically* spaced world radii, so one drifts
into view at every decade. Without them the zoom reads as a still frame and the
emptiness stops registering as distance.

---

### B.2 `anim-cathode-ray-tube` — කැතෝඩ කිරණ නලය

**§1.1.1 · පරීක්ෂණය · 28s ·** [CathodeRayTube.tsx](../src/components/animations/scenes/CathodeRayTube.tsx)

**Why animated:** four properties, each established by a *different modification
of the same tube*. A static figure needs four tubes.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | උපකරණය | Tube, cathode (−), anode (+) with slit, screen | — |
| 2 | 3.4 | ඍජු රේඛාවල | Maltese cross drops in; sharp shadow on the screen | ජායාව තියුණු → ඍජු රේඛාවල ගමන් |
| 3 | 10.2 | ස්කන්ධයක් ඇත | Paddle wheel spins only while the beam strikes it | රෝදය කැරකේ → ගම්‍යතාවක්, ස්කන්ධයක් |
| 4 | 16.4 | ඍණ ආරෝපිතයි | Plates in; beam bends toward (+) along a **parabola**, straight tangent after | ධන පැත්තට → ඍණ ආරෝපිතයි |
| 5 | 23.4 | සර්වසාධාරණ අංශුවකි | Cathode metal changes; e/m stays 1.76 × 10⁸ | e/m නොවෙනස් → සර්වසාධාරණ |

**Detail:** parabolic *inside* the plates, straight after — constant transverse
force on constant forward velocity. Drawing it as a single bend is the commonest
textbook error.

---

### B.3 `anim-millikan-oil-drop` — මිලිකන්ගේ තෙල් බිංදු පරීක්ෂාව

**§1.1.1 · පරීක්ෂණය · 23s ·** [MillikanOilDrop.tsx](../src/components/animations/scenes/MillikanOilDrop.tsx)

**Why animated:** the payoff is the bar chart. Every drop carries a different
charge, yet no measured value ever lands *between* the gridlines.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | ක්ෂේත්‍රයක් නැතිව | Drop falls at **constant** velocity, weight arrow only | — |
| 2 | 7.4 | ක්ෂේත්‍රය යෙදීම | Field lines appear, qE balances mg, drop stops dead | qE = mg → **q = mg/E** |
| 3 | 12 | බිංදු බොහෝ ගණනක් | Bars build one per drop; gridlines at 1e, 2e, 3e… | — |
| 4 | 17.4 | ක්වොන්ටීකෘතයි | Every bar sits exactly on a gridline | **e = 1.602 × 10⁻¹⁹ C** |
| 5 | 19 | ඉලෙක්ට්‍රෝන ස්කන්ධය | Three-line derivation | m = e ÷ (e/m) = 9.10 × 10⁻²⁸ g |

**Detail:** the drop falls at *constant* velocity, not accelerating — drag
balances weight almost immediately. Examiners reward this.

---

### B.4 `anim-positive-rays` — ධන කිරණවල ගුණ

**§1.1.3 · පරීක්ෂණය · 18s ·** [PositiveRays.tsx](../src/components/animations/scenes/PositiveRays.tsx)

**Why animated:** this is the comparison B.2's final stage points at, and a
frequent structured-question target.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | නල දෙක | Two tubes: cathode rays above, positive rays through a perforated cathode below | — |
| 2 | 4 | ගෑසය: H₂ | Both beams deflect; two e/m dials fill | — |
| 3 | 9 | ගෑසය: He | **Top dial unmoved. Bottom drops.** | — |
| 4 | 13 | ගෑසය: Ne | Bottom drops again | — |
| 5 | 15 | නිගමනය | Both tubes side by side | e/m නියතද → ඉලෙක්ට්‍රෝන. e/m ගෑසය සමඟ වෙනස්ද → ධන අයන |

**Detail:** deflection is log-scaled from real e/m values (1.76 × 10⁸ vs
9.58 × 10⁴ … 4.79 × 10³). Linear scaling would pin every positive ray to zero and
destroy the comparison.

---

### B.5 `anim-rutherford-gold-foil` — රදර්ෆෝඩ්ගේ රන්පත් පරීක්ෂාව ⭐

**§1.1.4 · පරීක්ෂණය · 26s ·** [RutherfordScattering.tsx](../src/components/animations/scenes/RutherfordScattering.tsx)

**The most examined experiment in the unit.** Three different outcomes happen to
identical particles, differing only in how close each passed to a nucleus. A
still image must draw three paths as though they were three experiments.

```
tan(θ/2) = k / b        →        θ = 2·arctan(k / b)
```

Behaviour *emerges*: large `b` → barely bends; `b → 0` → θ → 180°. Detector hit
points are solved exactly by intersecting each ray with the circular ZnS screen.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | උපකරණය | α source, gold foil edge-on, circular ZnS screen | — |
| 2 | 4.2 | නිරීක්ෂණය 1 | 16 amber particles, large `b`, straight through | පරමාණුව බොහෝ දුරට හිස් |
| 3 | 10.4 | නිරීක්ෂණය 2 | 5 violet, `b` = 10–19px — **smaller b, larger angle** | ධන ආරෝපිත කොටසක් ඇත |
| 4 | 15.6 | නිරීක්ෂණය 3 | 1 red, `b` ≈ 1.1px, θ ≈ 160°+. Nuclei **revealed now** | කුඩා ඝන න්‍යෂ්ටියක් |
| 5 | 20.2 | තොම්සන් ප්‍රතික්ෂේප | Three observation → conclusion rows, colour-matched | නිරීක්ෂණ 3 → නිගමන 3 |

**Sequencing:** nuclei stay hidden until stage 4. The student sees the *result*
first and the *cause* second — the order Rutherford met them.

---

### B.6 `anim-isotopes` — සමස්ථානික ගොඩනැගීම

**§1.1.5 · සංකල්පය · 18s ·** [IsotopeBuilder.tsx](../src/components/animations/scenes/IsotopeBuilder.tsx)

**Built to kill one mistake** the lesson names outright:
*"සමස්ථානිකවල ඉලෙක්ට්‍රෝන ගණන වෙනස්"*.

| # | t | Stage | On screen |
|---|---|---|---|
| 1 | 0 | ¹²C | 6 protons + 6 electrons placed, then 6 neutrons drop in one at a time |
| 2 | 5 | ¹³C | Identical protons and electrons. **One** extra neutron |
| 3 | 9.4 | ¹⁴C | One more neutron. Protons still 6, electrons still 6 |
| 4 | 15.6 | නිගමනය | All three side by side, counts labelled |

**Takeaway:** `නියුට්‍රෝන ගණන = A − Z`, plus a red warning line. Protons and
electrons are placed once and **never touched again** — the picture *states* that
chemical properties are identical rather than the caption asserting it.

---

### B.7 `anim-energy-quantisation` — ශක්ති ක්වොන්ටම්කරණය

**§1.2.1 · සංකල්පය · 18s ·** [EnergyQuantization.tsx](../src/components/animations/scenes/EnergyQuantization.tsx)

From the lesson's own image note: *"ක්වොන්ටීකෘත" is abstract until the opposite
stands next to it.*

| # | t | Stage | On screen |
|---|---|---|---|
| 1 | 0 | බෑවුම සහ තරප්පුව | Ramp (green, dotted with valid positions) vs staircase (violet). Same height |
| 2 | 3.6 | බෑවුමේ බෝලය | Ball rests at 0.62, then 0.87 — any height valid |
| 3 | 6.0 | තරප්පුවේ බෝලය | Ball steps 0 → 1 → 2, resting only on steps |
| 4 | 11.4 | ප්‍රමාණවත් නොවන ශක්තිය | **Ball rises to 2.55, turns red, gets a ✕, falls back.** Forbidden zone shaded |
| 5 | 16.0 | පරමාණුවට යෙදීම | E = hν, c = λν → E = hc/λ |

**The animation's addition over the still image is stage 4** — a *failed* attempt.

---

### B.8 `anim-em-spectrum` — විද්‍යුත්-චුම්බක වර්ණාවලිය

**§1.2 · සංකල්පය · 20s ·** [EmSpectrum.tsx](../src/components/animations/scenes/EmSpectrum.tsx)

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | මුළු වර්ණාවලිය | Gamma → radio. λ and ν axes running **opposite** ways. Visible band outlined | — |
| 2 | 5 | λ සහ ν ප්‍රතිලෝමයි | Marker sweeps right; the wave beneath visibly **stretches** | c = λν |
| 3 | 12 | දෘශ්‍ය කලාපය විශාලනය | The sliver expands to full width, in colour, with guide lines back to its real position | — |
| 4 | 17 | නිගමනය | — | අප දකින්නේ ~2%ක් පමණි; λ කුඩා නම් ශක්තිය වැඩි |

**Detail:** band positions come from log₁₀(λ/m), so the visible band's width
relative to the whole is **real** — a sliver you could miss, not exaggerated for
legibility. That is the point of stage 3.

---

### B.9 `anim-de-broglie` — ද බ්‍රොග්ලි සම්බන්ධය

**§1.2 · සංකල්පය · 17s ·** [DeBroglie.tsx](../src/components/animations/scenes/DeBroglie.tsx)

**Answers the question students actually ask:** *"එහෙනම් මගේ බෝලෙත් තරංගයක්ද?"*

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | වස්තු දෙකක් | Cricket ball and electron, both moving | — |
| 2 | 4 | සංඛ්‍යා | m and v fill in; λ = h/mv between them | — |
| 3 | 8 | බෝලයේ තරංගය | λ ≈ 10⁻³⁴ m renders as a **flat line** | — |
| 4 | 11 | ඉලෙක්ට්‍රෝනයේ තරංගය | λ ≈ 7 × 10⁻¹⁰ m renders as a visible wave, measured off | ඒ නිසයි ඉලෙක්ට්‍රෝන විවර්තනය නිරීක්ෂණය කළ හැක්කේ |
| 5 | 14 | උත්තරය | — | ඔව් — නමුත් m විශාල නිසා λ නොදැනේ |

**Detail:** both wavelengths are drawn at the **same metres-per-pixel scale**. The
ball's wave is flat not because it has none, but because the comparison is
honest. The emptiness is the explanation.

---

### B.10 `anim-hydrogen-spectrum` — හයිඩ්‍රජන් වර්ණාවලිය ⭐

**§1.3.1 · සංකල්පය · 27s ·** [HydrogenSpectrum.tsx](../src/components/animations/scenes/HydrogenSpectrum.tsx)

**The argument the whole unit turns on:** the spectrum is lines, not a rainbow,
therefore energy is quantised.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | ශක්ති මට්ටම් | Ladder n=1..6, real energies, dashed n=∞ at E=0 | — |
| 2 | 4.0 | අවශෝෂණය | Electron climbs n=1 → n=3 | — |
| 3 | 8.4 | විමෝචනය | Falls 3 → 2; photon **flies to its wavelength** on the strip | ΔE = hc/λ |
| 4 | 13.0 | බාමර් ශ්‍රේණිය | 3→2, 4→2, 5→2, 6→2 give 656🔴 486🩵 434🔵 410🟣 nm | — |
| 5 | 22.0 | ලයිමන් ශ්‍රේණිය | 2→1 photon lands *off* the violet end | ලයිමන් n=1 (UV) \| බාමර් n=2 \| පාෂන් n=3 (IR) |
| 6 | 24.4 | අභිසාරීතාව | Levels crowd at the top; Balmer lines crowd toward violet | රේඛීය වර්ණාවලිය = ක්වොන්ටීකෘත බවට සාක්ෂිය |

**The connection the lesson says students miss** — level spacing converging, and
lines crowding — are the *same fact* appearing twice. Stage 6 shows both at once.

---

### B.11 `anim-orbital-shapes` — කාක්ෂිකවල හැඩ

**§1.3.2 · සංකල්පය · 22s ·** [OrbitalShapes.tsx](../src/components/animations/scenes/OrbitalShapes.tsx)

**Why animated:** three dumbbells side by side look like three different things.
The fix is to **rotate one into another**.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | අක්ෂ තුන | x, y, z in a fixed pseudo-3D frame | — |
| 2 | 3 | s කාක්ෂිකය | Sphere — no directional preference | — |
| 3 | 8.4 | pₓ කාක්ෂිකය | Dumbbell along x, with the node at the origin | — |
| 4 | 12.4 | කරකවමු → p_y | A **copy of pₓ swings about the origin** onto y, leaving pₓ in place | එකම හැඩය, වෙනස් අභිමුඛතාව — ශක්තියද එකමයි |
| 5 | 16.4 | නැවතත් → p_z | Same again, onto z | — |
| 6 | 19.4 | නිගමනය | All four together | කාක්ෂික ගණන = 2l + 1 |

**Stage 4 is the whole design.** The student watches one object *become* the
other, so "same shape, different orientation" is something they saw.

---

### B.12 `anim-quantum-tree` — ක්වොන්ටම් අංක ගස් සටහන

**§1.3.3 · සංකල්පය · 20s ·** [QuantumTree.tsx](../src/components/animations/scenes/QuantumTree.tsx)

From the lesson's image note: drawn as a tree, *"ඇයි n=2 ට කාක්ෂික 4ක්"* becomes
something a student can **count**.

| # | t | Stage | On screen |
|---|---|---|---|
| 1 | 0 | n = 1 | l = 0 → mₗ = 0 → **1 leaf** |
| 2 | 5.2 | n = 2 | l = 0, 1 → mₗ = 0 and −1,0,+1 → **4 leaves** |
| 3 | 11.2 | n = 3 | l = 0, 1, 2 → 1 + 3 + 5 → **9 leaves** |
| 4 | 17 | n² රීතිය | Counts line up: 1, 4, 9 |

**Takeaway:** `කාක්ෂික = n²`, `උපරිම ඉලෙක්ට්‍රෝන = 2n²`. The tree is generated
from the rules (`l = 0…n−1`, `mₗ = −l…+l`), so the leaves **are** the count — each
mₗ leaf is drawn as the same empty orbital box that B.14 later fills.

---

### B.13 `anim-ionisation-jump` — අනුක්‍රමික අයනීකරණ ශක්ති

**§1.3 · සංකල්පය · 19s ·** [IonisationJump.tsx](../src/components/animations/scenes/IonisationJump.tsx)

A **data-reading skill**, not a fact to recall: exam questions supply the numbers,
so what must be learned is where to look.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | log පරිමාණය | Axes, with the reason for the log scale stated | — |
| 2 | 2.4 | Na | Bars build; huge jump after the **1st**, red marker | සංයුජතා ඉලෙක්ට්‍රෝන 1 → කාණ්ඩය 1 |
| 3 | 8 | Mg | Jump after the **2nd** | සංයුජතා 2 → කාණ්ඩය 2 |
| 4 | 13 | Al | Jump after the **3rd** | සංයුජතා 3 → කාණ්ඩය 13 |
| 5 | 16.4 | රීතිය | Summary: Na → 1 · Mg → 2 · Al → 3 | පිම්මට පෙර ඇති ගණන = කාණ්ඩය |

**Detail:** valence bars are coloured, core bars greyed, so the boundary is a
colour change as well as a step. The log axis is explained on screen because
*why* it is logarithmic is itself examinable.

---

### B.14 `anim-aufbau-filling` — ඉලෙක්ට්‍රෝන විනයාස පිරවීම

**§1.4 · සංකල්පය · 30s ·** [AufbauFilling.tsx](../src/components/animations/scenes/AufbauFilling.tsx)

Three rules taught together because they only make sense together.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | ශක්ති ඉණිමඟ | Subshells by energy, numbered in fill order. **4s below 3d** | — |
| 2 | 4 | පව්ලි | H → 1s¹, He → 1s². A pair is ↑↓, never ↑↑ | කාක්ෂිකයකට 2යි, විරුද්ධ භ්‍රමණ |
| 3 | 10.5 | හුන්ඩ් | B → 2p¹, C → 2p² in **separate** boxes | — |
| 4 | 14.4 | වැරදි ආකාරය | **2p² crammed into one box, struck through in red** | හිස් කොටුවක් තියෙනකම් ජෝඩු කරන්න එපා |
| 5 | 17.5 | නිවැරදි ආකාරය | N → 2p³ singly; O → 2p⁴ pairs only once boxes are full | — |
| 6 | 22 | Cr සහ Cu | 4s¹ 3d⁵ and 4s¹ 3d¹⁰, with expected ✗ / actual ✓ | අර්ධ/සම්පූර්ණ පිරුණු d අමතර ස්ථායිතාවක් |
| 7 | 27.4 | නීති තුන | — | අවුෆ්බාවු → පව්ලි → හුන්ඩ් |

**Two design decisions:** Hund's rule is *implemented* (`occupancyOf`), not
tabulated per element, so the boxes are filled the way a student derives them.
And placing 4s below 3d on the ladder means the Cr/Cu anomalies in stage 6 are
not a separate fact — the boxes are already in the order that explains them.

---

### B.15 `anim-periodic-build` — ආවර්තිතා වගුව ගොඩනැගීම

**§1.5 · සංකල්පය · 27s ·** [PeriodicBuild.tsx](../src/components/animations/scenes/PeriodicBuild.tsx)

The table is usually a finished object whose shape must be accepted. Building it
block by block makes the shape a **consequence**.

| # | t | Stage | On screen | Why that width |
|---|---|---|---|---|
| 1 | 0 | හිස් රාමුව | Outlined cells; f-block strip dashed below | — |
| 2 | 3 | s ගොනුව | Blue, groups 1–2 | s holds 2 electrons → 2 columns |
| 3 | 9 | p ගොනුව | Green, groups 13–18 | p holds 6 → 6 columns |
| 4 | 15 | d ගොනුව | Orange, groups 3–12, wedging **between** s and p | d holds 10 → 10 columns |
| 5 | 21 | f ගොනුව | Purple, detached strip | f holds 14 → would make the table unprintable |
| 6 | 24 | නිගමනය | — | කාණ්ඩය = සංයුජතා · ආවර්තය = කවචය · ගොනුව = අවසන් උපකවචය |

**Detail:** stage 4 explains both the famous gap in periods 2–3 *and* why period
4 is suddenly longer — one insertion, two puzzles solved.

---

### B.16 `anim-periodic-trends` — ආවර්තීය නැඹුරුතා

**§1.6 · සංකල්පය · 29s ·** [PeriodicTrends.tsx](../src/components/animations/scenes/PeriodicTrends.tsx)

Four trends are usually four things to memorise. They are **one cause**.

| # | t | Stage | On screen | Takeaway |
|---|---|---|---|---|
| 1 | 0 | එකම වගුව | Table outline. It never moves — only the data on it | — |
| 2 | 3 | පරමාණුක අරය | Circles resize by real radii; direction arrows | දකුණට → කුඩා · පහළට → විශාල |
| 3 | 10 | අයනීකරණ ශක්තිය | Heat map; arrows flip to the **opposite** direction | අරය කුඩා නම් IE වැඩි |
| 4 | 17 | ඉලෙක්ට්‍රෝන ලබා ගැනීමේ ශක්තිය | Same direction. **Gaps** at group 2 and noble gases | — |
| 5 | 22 | විද්‍යුත්-සෘණතාව | F highlighted at 3.98 | F > O > N ≈ Cl |
| 6 | 26 | එකම හේතුව | — | Z_eff සහ කවච ගණන — හතරම ඉන් ව්‍යුත්පන්නයි |

**One table, four overlays swapped in place.** The student sees radius shrinking
toward the top right, then immediately sees ionisation energy growing toward the
same corner. Two diagrams side by side cannot force that comparison.

**The gaps are real.** Noble gases have no electronegativity value and group 2 no
useful electron affinity, so those cells stay **empty** rather than being filled
with a guess — and the absences are themselves examinable.

---

## Part C — Adding a new animation

Five steps, ~30 minutes for a simple scene.

**1. Write the scene** in `src/components/animations/scenes/YourScene.tsx`:

```tsx
export function YourScene({ t, width, height, isDark, reduceMotion }: SceneProps) {
  const c = sceneColors(isDark);
  const time = reduceMotion ? 15 : t;            // land on a readable final state
  const appear = easeOut(segment(time, 0, 1.5)); // every element: a segment() window

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>{/* geometry */}</Svg>
      <SceneLabel x={…} y={…} text="සිංහල ලේබලය" color={c.label} opacity={appear} />
    </View>
  );
}
```

**Rules:** never call `Math.random()` (use `seeded(index)`); never keep state
between frames; lay out against `width`/`height`, never constants.

**2. Register it** in `src/features/animation/registry.ts` with `duration`, and
stages whose `at` values match the windows used in the drawing.

**3. Reference it** from lesson content: add the id to `animationIds`.

**4. Run the tests** — `npm test` checks stage ordering, that stages fall inside
`duration`, that the first is at 0, that every practical states a conclusion,
that no lesson references an id with no scene, and that the periodic data still
encodes the right trends.

**5. Watch it once.** The tests verify structure, not that captions line up with
what is on screen. Only your eyes do that.

---

## Part D — Coverage

| § | Animation | Kind | Duration | Lesson |
|---|---|---|---|---|
| 1.1 | පරමාණුවේ පරිමාණය | concept | 17s | 1.1 |
| 1.1.1 | කැතෝඩ කිරණ නලය | **practical** | 28s | 1.1 |
| 1.1.1 | මිලිකන්ගේ තෙල් බිංදු | **practical** | 23s | 1.1 |
| 1.1.3 | ධන කිරණවල ගුණ | **practical** | 18s | 1.1 |
| 1.1.4 | රදර්ෆෝඩ්ගේ රන්පත් ⭐ | **practical** | 26s | 1.1 |
| 1.1.5 | සමස්ථානික ගොඩනැගීම | concept | 18s | 1.1 |
| 1.2.1 | ශක්ති ක්වොන්ටම්කරණය | concept | 18s | 1.2 |
| 1.2 | EM වර්ණාවලිය | concept | 20s | 1.2 |
| 1.2 | ද බ්‍රොග්ලි සම්බන්ධය | concept | 17s | 1.2 |
| 1.3.1 | හයිඩ්‍රජන් වර්ණාවලිය ⭐ | concept | 27s | 1.3 |
| 1.3.2 | කාක්ෂිකවල හැඩ | concept | 22s | 1.3 |
| 1.3.3 | ක්වොන්ටම් අංක ගස් සටහන | concept | 20s | 1.3 |
| 1.3 | අනුක්‍රමික අයනීකරණ ශක්ති | concept | 19s | 1.3 |
| 1.4 | ඉලෙක්ට්‍රෝන විනයාස පිරවීම | concept | 30s | 1.4 |
| 1.5 | ආවර්තිතා වගුව ගොඩනැගීම | concept | 27s | 1.5 |
| 1.6 | ආවර්තීය නැඹුරුතා | concept | 29s | 1.6 |

**16 built · 4 practicals · ~6 minutes of animation · every lesson from 1.1 to
1.6 has a සජීවීකරණ tab.**

### Cross-references between scenes

The set is designed as a sequence, not a pile:

- **B.2 → B.4** — the cathode ray tube's last stage names the e/m contrast that positive rays then demonstrates.
- **B.1 → B.5** — the atom-scale ratio is why most α particles pass straight through.
- **B.7 → B.10** — quantised staircase, then the line spectrum that proves it.
- **B.12 → B.14** — the tree's mₗ leaves are drawn as the same empty orbital boxes Aufbau fills.
- **B.14 → B.15** — the fill order that gives Cr its anomaly is the order that lays out the table.
- **B.13 → B.16** — successive ionisation energies, then first ionisation energy as a periodic trend.
