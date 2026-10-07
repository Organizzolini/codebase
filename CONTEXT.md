# Codebase

A pnpm and Nx monorepo of personal applications, shared packages, and the tools
that keep them structurally consistent.

## Conformetry

**Generator**:
A named pairing of a template with the inputs needed to render it, declared once
in the conformetry configuration and reachable from both hosts.
_Avoid_: Schematic, scaffold, blueprint

**Template**:
A folder of ordinary files that a generator renders, and the standard every
instance is measured against afterwards.
_Avoid_: Rule, fixture, boilerplate

**Instance**:
Generated code on disk that a template explains — a whole module directory, a
single file, or a set of files located together by one pattern.
_Avoid_: Copy, output, generated folder

**Language**:
The comparison engine for one family of file types, selected by file extension,
that measures an instance against its template.
_Avoid_: Rule, validator rule, check

**Fallback**:
The line-by-line text comparison that every file extension no Language claims is
routed to. An unclaimed extension is never skipped — the Fallback is the floor
under a validation run, not a gap in it.
_Avoid_: Default language, catch-all, unhandled

**Difference**:
Something a template declares that its instance lacks. Content the instance adds
is never a difference.
_Avoid_: Finding, violation, failure

**Error**:
A difference severe enough to fail a validation run.
_Avoid_: Finding, issue

**Conformance**:
How completely an instance carries what its template declares.
_Avoid_: Compliance, passing, matching

## Measurement

**Target**:
A named set of files, defined by include and exclude globs, that codometer
measures as a single unit. A target is a set of paths and nothing more — what
gets computed over it is chosen separately.
_Avoid_: File set, bundle, artifact, source, collection

**Analysis**:
A kind of examination codometer runs over a target, producing metrics. Language
analysis parses files and counts constructs; size analysis compresses them and
counts bytes.
_Avoid_: Check, scan, pass

**Metric**:
A single named number produced by one analysis over one target, addressed by a
dotted path.
_Avoid_: Statistic, measurement, count, stat

**Limit**:
A declared value a metric may not exceed. A metric without one is measured and
reported, never gated.
_Avoid_: Budget, threshold, ceiling, maximum, cap, size limit

**Breach**:
A metric that exceeds its limit.
_Avoid_: Violation, failure, overage, regression

**Severity**:
Whether a breach fails the run (`fail`) or is reported without affecting its
outcome (`warn`).

**Staleness**:
A committed output no longer matching what a fresh run would produce. Distinct
from a breach: staleness is about drift between the report and reality, a breach
is about magnitude. Both fail a run, and they are never the same finding.
_Avoid_: Drift, out of date, dirty

## Meanders

**Meander**:
A single generated Greek key/fret ornament — a band of ink drawn from a Code,
rendered as one SVG document.
_Avoid_: Pattern, motif, key pattern

**Code**:
The direction bits that are a meander: one hexadecimal digit per interior lattice
point of one true repeat, read row-major and worth `8` north, `4` south, `2` east
and `1` west. A meander is its Code — nothing else identifies it, and nothing about
how it is drawn, measured, or named is stored separately from it.
_Avoid_: Lattice address, hash, fingerprint

**Phase**:
Which cyclic rotation of a Code's columns is the one stored and drawn. The same
band cut at a different column is the same meander in a different phase, so a
meander has exactly one canonical phase rather than one Code.
_Avoid_: Rotation, offset, cut

**Tile crossing**:
The join where a tile's last column meets its first when a Code is read as a
repeating band rather than as a finite drawing. What crosses it — a stranded
end, a junction, a closed loop — is measured rather than assumed, and the
measurement is what a canonical phase is chosen to minimize.
_Avoid_: Seam (formerly this project's own term), wrap, edge, border

**Characteristic**:
A measured structural property of a meander, read as a pattern over the Code's
digits where one exists and by walking the tile where none does. Characteristics
are an open, growing set — adding one changes no other module.
_Avoid_: Property, metric, trait

**Pattern characteristic**:
A compound boolean Characteristic built only from other Characteristics — a
named shape such as a whirl or an arcade. A meander can hold several at once,
or none; it is found by filtering on them, never by a stored label.
_Avoid_: Family, style, kind, category, classification

**Corner**:
The direction a letter glyph's strokes run toward — Southeast, Southwest,
Northeast or Northwest. Reaching another corner means mirroring the glyph, never
turning it.
_Avoid_: Facing, side, handedness, East/West/Inverted

**Base corner**:
The corner a script's letters face as written, set by its reading direction:
Southeast for left-to-right scripts, Southwest for right-to-left ones. Every other
corner of a letter is a mirroring of its base corner.
_Avoid_: Default orientation, upright corner

**Orientation**:
One of the sixteen ways a letter glyph can be drawn: a corner, then a clockwise
turn of none, a quarter, a half, or three quarters. Orientations that draw the
same ink are still distinct names for it, each counted alike.
_Avoid_: Variant, rotation (for the whole), pose

**Positional form**:
The shape a joining script's letter takes from where it sits in a word —
isolated, initial, medial, or final — each drawn as its own letter, with a unit
joining stroke on every side it connects. A form a letter never takes, such as
a non-connecting letter's initial or medial, is left out rather than drawn.
_Avoid_: Contextual form, allograph, position

**Skeleton (rasm)**:
A letter's dotless shape, which letters differing only by dots or by other
marks such as hamza share. A skeleton is drawn once, as one letter, and every
other letter sharing it is an alias of that letter rather than a second copy
of its ink.
_Avoid_: Base letter, outline, stem

**Tile**:
One repeat unit's worth of the lattice a meander is drawn on — the grid of points
and edges a Code is spelled into.
_Avoid_: Cell, unit, permutation

**Rows**:
The parameter that sets a meander's grid density. It does not change the
canvas height, which stays fixed; instead it divides that fixed height into
finer subdivisions, shrinking the grid unit and stroke width as rows
increases.
_Avoid_: Row count, height, N

**Grid unit**:
The base spacing a meander's coordinates are built from, derived from canvas
height divided by rows. Stroke width and offsets are themselves derived from
the grid unit, not set independently.
_Avoid_: Cell size, spacing, step

**Channel**:
The white space separating two neighboring strokes. Exactly one stroke width wide
everywhere inside a band, which is what makes a meander space-filling.
_Avoid_: Gap, whitespace, margin

## Change reporting

**Baseline**:
A previously published report — from the latest successful run on `main` — that
a current report is compared against to find what changed.
_Avoid_: Previous run, main, comparison

**Change**:
The difference between a metric's current value and its value in the baseline.
A metric with no change is left out of a change report unless it is currently
breaching a limit.
_Avoid_: Delta, diff, drift

**Measured**:
Whether a metric was recomputed by the current run, as opposed to standing in
with its baseline value because the run's targets did not include that
project. An unmeasured metric can still breach if its baseline value already
exceeds a limit. Distinct from staleness below: measured is about which run
produced a number, staleness is about whether a committed one still matches.
_Avoid_: Fresh, rebuilt, stale

## Callidescope

**Callable**:
One function-like declaration the tool traces — a function, a method, an
accessor, an arrow property, or a callback handed to another callable.
Identified by its file and the byte offset its declaration starts at, and
addressed as `<file>#<qualified-name>`.
_Avoid_: Function, symbol, node

**Stack**:
One entry point and the single deepest path of frames below it. A stack whose
path runs through a call nothing could follow reports a **floor** rather than a
measurement.
_Avoid_: Trace, path, chain

**Depth**:
Frames on a stack, entry point inclusive, and one of the two things callidescope
gates. Never used for nesting elsewhere.
_Avoid_: Height, levels, layers

**Breadth**:
Distinct callables one callable calls directly, and the other thing callidescope
gates. Measured for every callable whether or not a limit exists to exceed.
_Avoid_: Fan-out, width, spread

**Entry point**:
A callable that roots a stack, because a framework, a runtime, or nothing at all
calls it. `declared` is the only kind a person chose; every other kind is
inferred from a decorator, a file name, an export, or from nothing having called
it.
_Avoid_: Root, caller, top-level

**Defaults**:
What a project takes from the workspace, by spreading `projectDefaults` into
its own `callidescope.config.ts` and overriding what it means to. A project's
file is the complete statement of how that project is traced and judged: every
field present, and a traced project with no file at all a refusal. Nothing is
**inherited** — there is no per-field fallback to a second file and no record
of whether a number was declared or handed down, because the spread put every
number in the project's own file where a reader can see it. See
[ADR 0007](docs/adr/0007-complete-project-configurations.md).
_Avoid_: Inherited, fallback, cascade

Callidescope has no notion of a **module** and measures no **cohesion**. It once
derived a `<project>:<subtree>` module identifier to report module spread and
misplaced callables against; both findings and the identifier were removed — see
[ADR 0006](docs/adr/0006-narrow-callidescope-to-depth-and-breadth.md). A
callable belongs to a **project** and to a file, and to nothing between them.

## Codependix

**Graph**:
A dependency structure for one level of the codebase — projects, NestJS
modules, or files — built by exactly one codependix package (`codependix-nx-projects`,
`codependix-nestjs-modules`, `codependix-file-imports` respectively).
_Avoid_: Diagram, tree, map

**Neighborhood**:
A project's own graph, scoped to its immediate one-hop dependencies and
dependents. The default granularity codependix exports per project.
_Avoid_: Local graph, one-hop graph, subgraph

**Workspace Graph**:
The whole-repository graph across every project, exported once at the
workspace root rather than per project.
_Avoid_: Full graph, global graph, root graph

**Export**:
A graph rendered to JSON or Markdown. An export is descriptive: it is written
or found stale, never breached. Gating is the boundary's job, not the
export's.
_Avoid_: Report, output, artifact

**Boundary**:
A declared rule about what a graph is allowed to look like, and codependix's
gating word. A rule is `allow`, `forbid`, or `acyclic`, is keyed by the graph
level it judges, and produces a **violation** — an edge or a cycle it
condemns. Never a breach (codometer's), a threshold (conformetry's), or a
depth (callidescope's).
_Avoid_: Constraint, policy, rule violation, breach

**Anchor**:
The comment marker codependix writes an export between in a Markdown file,
read and rewritten in place on `--write`. Independent of conformetry's
template mechanism — codependix owns its own anchor syntax and does not
depend on any conformetry package.
_Avoid_: Marker block, placeholder, template

## Neighboring gates

Each quality tool owns one gating word, and they are not interchangeable.

**Threshold**:
Conformetry's zero-to-one score for the conformance it requires of an instance.
Never used for codometer's limits.

**Depth**:
Callidescope's call-stack length, and the thing it flags as too deep. Never used
for nesting elsewhere.

**Boundary**:
Codependix's declared rule about the shape of a graph, and the thing it flags
as violated. Never used for a limit, a threshold, or a depth. Its export
remains descriptive — only a boundary gates.

**Reports** is the one word three of them share deliberately. `--check
reports` means the same thing in callidescope, codometer, and codependix: a
configured destination no longer holds what a fresh run would write. Each
tool's other `--check` name is its own gating word — `depth`, `limits`,
`boundaries` — because those are the magnitudes only it measures.

## IC-Suite Layers

The four ic-suite toolchains — conformetry, codometer, callidescope, and
codependix — will share one five-layer spine, each layer depending only
downward, plus an optional `nx` plugin layer above `cli` where one exists
(callidescope and conformetry only). This pull request lands the vocabulary
first, by design: the `layer:*` tags below arrive with each toolchain's own
pull request, not with this one, so no package carries one yet. See
[ADR 0013](docs/adr/0013-name-the-ic-suite-layers.md) for the sharp test that
decides layer membership, the rejected alternative, and the no-shared-package
constraint.

| Layer | Tag | Holds | Never holds |
| --- | --- | --- | --- |
| **core** | `layer:core` | Domain vocabulary only: result and finding types, error classes, shared enums and unions, analyzer and validator contracts | Services, modules, anything executable |
| **configuration** | `layer:configuration` | The config file's schema, loading, defaults, and override resolution, **plus CLI flag resolution**, producing one resolved configuration object | Domain result types |
| **analysis** | `layer:analysis` | What the tool actually does. Per-suite names and per-suite shape | Rendering, command wiring |
| **output** | `layer:output` | Every render target: JSON, markdown, mermaid, anchor blocks, destination routing, delivery | Analysis |
| **cli** | `layer:cli` | `*.command.ts` modules and nothing else | Any logic |

**Core-versus-configuration test**:
Whether a type belongs in `core` or `configuration`: if it describes what the
tool produced, it is `core`; if it describes what the user wrote in
`<tool>.config.ts`, it is `configuration`.

The analysis layer is the one layer that deliberately does not converge on a
shared name — it is governed by a rule instead: one package per independently
usable analyzer, named for what it analyzes. `agents` and `examples` carry no
layer tag; neither is in the runtime chain.

## Publishing

**Suite**:
One of the four toolchains this repository publishes — conformetry, codometer,
callidescope, codependix — named for the command a reader runs. A suite is a
product, not a directory: its packages version independently but are documented
and discovered as one thing.
_Avoid_: Toolchain family, package group, monorepo project

**Publishable packages**:
The packages a release actually sends to npm. Deliberately narrower than the
packages that build: the `*-agents` and `*-examples` packages are never
published, because skills travel through `skills-lock.json` and examples are
fixtures, several broken on purpose.
_Avoid_: Publish set, the packages, release set

**Gate**:
A control that stops a package reaching npm. Three exist and they are not
interchangeable: `private` in the manifest, which npm itself refuses to publish
past; the orchestrator's own projects filter; and the registry's permissions.
A package outside the publishable packages is held by the first two, never by only one.
_Avoid_: Flag, switch, block

**Inline**:
Compiling another workspace package's code into a package's own build output,
so the published tarball carries it and never names it as a dependency. What
is inlined is the code, never the source file — nothing is copied into the
repository, and the dependency stays a single package here.
_Avoid_: Vendor, bundle, embed, copy

**Cascade**:
The patch bump a package receives because something it depends on was
versioned, rather than because it changed. What keeps independently versioned
packages within a suite consistent.
_Avoid_: Ripple, propagate, bump dependents

**Round size**:
The shape every declared codometer limit takes: a power of two, or three times
one. `4`, `6`, `12`, `16`, `24`, `32`, `48`, `64`, `96`, `128`, `192`, `256`,
`384`, `512`. A limit is chosen by rounding a measurement up to the next such
number, never by recording what a run happened to measure — an exact figure
reads as a target and invites being edited to whatever the next run produced.
Nothing enforces this; every limit in the workspace follows it.
_Avoid_: Budget, rounded limit, nice number

## Sempientor

**Semantic gap**:
A meaning English has no word for, though its neighbors are lexicalized. Found
by enumerating concepts and subtracting the lexicon. The most interesting of the
three gap kinds and the hardest to detect.
_Avoid_: Lexical gap, conceptual hole, missing word

**Formal gap**:
A form English permits but attaches no meaning to. Found by enumerating legal
forms and subtracting the lexicon — the opposite direction of travel from a
semantic gap. Morphological and phonotactic gaps are both formal gaps.
_Avoid_: Nonword, pseudoword, unattested form

**Morphological gap**:
A word English's productive word-formation rules generate but that no attested
word occupies. `describal` is one; `description` exists and `describal` does not.
_Avoid_: Potential word, derivational hole, unattested derivation

**Phonotactic gap**:
A segment sequence English phonology permits that no word uses — `/sprɪk/`. Named
a morpheme gap in the literature; this codebase says phonotactic, because the
sequence is what is missing rather than a meaningful unit.
_Avoid_: Morpheme gap, phonological gap, illegal word

**Systematic gap**:
A form English's rules forbid outright, such as a word with no vowel. Never a
finding — a systematic gap is what separates a gap worth reporting from noise.
_Avoid_: Impossible word, invalid form, rejected candidate

**Blocking**:
An existing word standing in the place a generated form would occupy, which is
what makes that form a gap rather than merely an unused string. `describal` is
blocked by `description`; `stratifiability` is unused and blocked by nothing.
Blocking has two halves and both are recorded: form blocking, where the string
already exists, and meaning blocking, where a different string already carries
the meaning.
_Avoid_: Collision, conflict, duplicate

**Occupant**:
The attested word that blocks a candidate, recorded alongside it rather than in
place of it. A gap and its occupant are two facts about the same cell of the
paradigm, and both are kept.
_Avoid_: Winner, real word, existing form

**Survey**:
One complete pass over the lexicon hunting one kind of gap, with the parameters
it ran under. Three exist — morphological, phonotactic, and semantic — and they
share candidates and assays but nothing else.
_Avoid_: Target, run, scan, job

**Candidate**:
A generated form under evaluation, kept permanently whether or not it survives.
Nothing generated is ever discarded — a candidate that fails carries the record
of what it failed and why.
_Avoid_: Proposal, suggestion, output, result

**Assay**:
One test a candidate is put through, yielding a verdict without consuming the
candidate. Deterministic assays are recorded as columns because they can always
be recomputed; probabilistic ones are recorded as rows carrying the model and
version that produced them, because they cannot.
_Avoid_: Gate, check, filter, validation

**Coinage**:
A candidate that has passed every assay and been approved by a person. The only
thing this project asserts is a word; everything else is a candidate.
_Avoid_: Neologism, invention, new word, accepted candidate
