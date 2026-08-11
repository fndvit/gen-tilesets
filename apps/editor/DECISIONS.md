
---

### 2026-08-10 — The brush's gesture

**Arose in:** Step 7. `09` §7.3 specifies the *conversion* — pointer to render space, then
`cellAt` — and the bound, and says nothing about the gesture that drives them.

**Answer:** a stroke. Pointer-down decides the mode from the cell it lands on — empty adds,
painted erases — and the **whole stroke keeps that mode**, so a drag paints or erases but
never both.

Rejected: deciding per cell, which inverts every cell a drag crosses. Over a half-painted
region that is unpredictable rather than merely different, and the author is holding a brush,
not a toggle.

`addCell` is idempotent for the same reason. A duplicated entry is legal and invisible —
`cellList`'s predicate is a membership test, so the second copy changes nothing — which is
exactly why it must not accumulate: the file would grow on every stroke with nothing to show
for it and no way to see what to remove.

---

### 2026-08-10 — `<Tileset>` exposes its render box element

**Arose in:** Step 7. `08` §7 requires it — "the component therefore exposes its render box
element" — and it had not been built, so this is the same shape as Step 0's `selection()`:
spec-mandated work, not a new surface.

**Answer:** a bindable `box` prop. `08` §7's reasoning is adopted unchanged: converting a
pointer event into render space is `07` §8.2's explicitly-assigned *caller* work and requires
the box's position on screen, and "an editor calling `getBoundingClientRect()` on it is doing
something **R5** does not touch".

**`Wpx` is not read from the element.** `PreviewFrame` owns that number (**E11**) and passes
it to its children, because a DOM measurement is not reactive and an overlay whose grid was
computed from a stale width would disagree with the drawn one at exactly the moment the author
drags the frame. The element is used for *position*, which is all §8.2 needs it for.

**The display zoom is recovered from the element, not passed in.** `getBoundingClientRect()`
is post-transform and `offsetWidth` is pre-transform, so their ratio *is* the zoom. No caller
can pass the wrong one, and this is `05` **X7**'s posture applied to a number: a plausible
wrong answer with no error anywhere — a click landing one cell off — is the failure mode to
design out rather than to document.
