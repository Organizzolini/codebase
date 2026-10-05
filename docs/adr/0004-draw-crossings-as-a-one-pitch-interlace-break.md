# Draw an interrupted crossing as a one-pitch break in the under-strand

`meanderaw`'s charter says ink contains no X-junctions (invariant 4) and that
every interior white channel is exactly one stroke width (invariant 2). The
`cross` family relaxes the first to draw the form Calder Loth calls the complex
Greek meander, and its `interrupted` mode is the first place two charter rules
have pulled against each other: an interlace gap is white, so it has to be
measured against invariant 2 like any other white. We break the under-strand by
**exactly one grid pitch either side of the junction**, which leaves a gap of
exactly one stroke width, keeps invariant 2 intact, and needs no z-order — at
the cost that the gap is the same width as every other channel in the band, and
that the crossing disappears from the ink graph.

This was written after the family drew something. Every number below is
`MeanderTopologyService.measure` reading the six documents committed under
`applications/meanderaw/meanderaw-cli/output/cross/*/*.svg`.

## Considered options

The lattice is what makes this a short list. Stroke width is half a grid unit
and the grid pitch is two stroke widths, so a break can only be a whole number
of pitches — a coordinate off the lattice is refused outright by
`MeanderLatticeService`, which is the same reader the charter test measures
through. With `stroke-linecap="square"` giving back a quarter unit at each end,
a break of `n` pitches leaves `(2n - 1)` stroke widths of white.

- **Break by one pitch.** Chosen. White gap `= 1 × strokeWidth`, exactly the
  channel invariant 2 already permits everywhere else. Measured on
  `cross/6-rows/interrupted-6-repeats-6r2c-56883344a9.svg`: `channelWidthCompliant: true`,
  `inkTJunctions: 0`, `inkXJunctions: 0`. Its unit test measures the four white
  gaps down one bar in pixels — two where the bar meets the band borders, two
  either side of the rail — and asserts all four equal the stroke width.
- **Break by two pitches.** Rejected, and it is not a matter of taste: the gap
  would be three stroke widths, and the lattice point in the middle of it would
  carry no ink at all, which is precisely the failure `channelWidthCompliant`
  reports. Invariant 2 would be broken as measured, not merely as felt.
- **Break by half a pitch.** Rejected: the endpoint would not sit on the
  lattice, so `MeanderLatticeService` refuses the document with
  `OffLatticeCoordinateError` and the family could not be measured against the
  charter at all. The two square caps would also meet the over-strand exactly,
  leaving no visible gap.
- **Layered paths with real z-order.** Rejected. Painting the over-strand on top
  of an unbroken under-strand gives a perfect interlace and breaks invariant 6,
  the flat path model: paths would stop being unordered, and every downstream
  reader — the topology service included — would have to learn painting order
  before it could say what the drawing contains. Invariant 6 may be relaxed only
  by an ADR, and this is that ADR declining to relax it: the one-pitch break
  costs a visual distinction, while z-order costs the property that makes every
  meander in this project measurable from its path data alone.
- **A second, narrower stroke width for the under-strand.** Rejected for the
  same reason and more cheaply: invariant 6 also fixes one stroke width per
  document, and `MeanderLatticeService` refuses a document declaring two.

## Consequences

- **Interrupted mode has no ink X-junctions.** This is the real cost and it is
  worth stating plainly, because it is not the cost the ticket anticipated.
  Breaking the under-strand adjacent to the junction removes its two arms, so
  the lattice point drops from degree 4 to degree 2 and the crossing leaves the
  ink graph. Measured: solid mode reports `inkXJunctions: 12` at 6 repeats,
  interrupted reports `0`. The family therefore declares its relaxation of
  invariant 4 **with `interrupted` as an exception**, in the charter test's
  `RELAXED_INVARIANTS` — which asserts a declared relaxation is present as well
  as an undeclared one absent, so neither mode can quietly change what it does.
- **Invariant 2 is not relaxed, in either mode.** The break gives up a grid
  edge, never a lattice point: the bar's two remaining ends still paint the
  levels either side of the rail. A unit test asserts the two modes paint an
  identical set of lattice points and that interrupted draws a strict subset of
  solid's edges — 24 fewer, two per crossing, all vertical.
- **The interlace reads from continuation, not from gap width.** A one-pitch
  break is the same white as the channel between the bar and the band border,
  so nothing about the gap's size says "under". What says it is that the
  broken strand resumes in line on the far side. That is a weaker signal than
  ink of two weights would give, and it is the price of keeping invariant 6.
- **`cross` cannot be drawn below 6 rows**, where a family that only ever drew
  solid could go down to 4. The crossing sits at `floor(rows / 2)` and the break
  gives up the level either side of it, so below 6 rows the _upper_ remnant has
  no whole grid level left and collapses to a zero-length run — a square line
  cap and nothing else, a dot one stroke wide instead of a length of strand. At
  4 rows both remnants collapse.

  **This is a legibility floor, and no measurement enforces it.** At 4 and 5
  rows the drawing is still fully space-filling: measured,
  `channelWidthCompliant` is `true` at both, because a collapsed run still
  paints its own lattice point and the unit's top connector paints level 1
  regardless. So the charter would pass a rendering in which `interrupted`
  means nothing, and the constant is the only thing that refuses it — which is
  why `cross-motif.service.unit.test.ts` pins the collapse _and_ the fact that
  topology misses it, at 4, 5, and 6 rows. `STRUCTURAL_MINIMUM_ROWS` holds one
  minimum per family, so the family takes the stricter of its two modes.
- **Relaxing invariant 4 while holding 1, 2, 3, and 5 leaves very little room,
  and the family's plainness is that constraint rather than a lack of
  ambition.** Space-filling puts ink at every interior lattice point; no
  branching means a horizontal run and a vertical run may only cross outright or
  turn at each other's ends, never meet in a T. Together those force a vertical
  bar into every interior column, and a horizontal fillet can then turn nowhere
  — so the weft runs the full width and only the warp meanders. This was
  arrived at by search rather than proof: overlaying every existing family on a
  shifted or mirrored copy of itself, at every offset up to six columns and
  three rows, with and without a vertical mirror, produced a T-junction every
  time and a legal crossing never. That search ran as a temporary test beside
  `meander-topology.service.integration.test.ts` and was deleted before this was
  committed — it is a loop over `MeanderLatticeService.build`'s output, taking
  the union of its edge sets with a translated copy and tallying lattice-point
  degrees, the same method `README.md`'s negative-space survey used. **Nothing enforces this
  paragraph.** Read it as "no crossing family we could construct escapes this",
  not as a theorem, and not as a claim a failing test would catch.
- **The output is `derived`, not `attested`.** The complex Greek meander is real
  ornament, and Fréart's right-angle rule is why its junctions are `+` rather
  than `X`. This application's rendering of it was checked against nothing: the
  six older families were verified byte-exact against hand-drawn references, and
  no such reference exists here. The committed documents are the baseline, and
  they are a baseline for what the code does, not evidence of fidelity to
  anything.
