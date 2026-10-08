# 🏷️ Frame annotations

**One frame per shape a comment-trivia reader gets wrong, or a renderer has to
shorten**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read the `FrameAnnotationsService.trace` stack in [`output/report.md`](../../output/report.md), and the same comments in full in [`output/report.json`](../../output/report.json).

The second stack is not there. `output/report.md` prints only the stacks over
the depth limit, and `legacyRender` is two frames — both stacks are printed
together in
[the section at the bottom of the package guide](../../README.md#-callidescope),
which is where to read them side by side.

Every frame is annotated from the **type checker**, not from the comment trivia
attached to the node the graph points at. That distinction is what makes these
right:

| Frame | Shape | Why trivia gets it wrong |
| ----- | ----- | ------------------------ |
| `render` | An **overload** | The documentation sits on the signature, not on the implementation the graph points at |
| `summarize` | An **arrow-typed property** | The documentation sits on the property, not on the arrow |
| `describe` | A **destructured parameter** | It has no name at all in the syntax — printed `{ count, name }: DescribeArguments` |

And three shortenings, which apply to the **printed tree only**:

| Frame | Shortening |
| ----- | ---------- |
| `collapseThisSignatureBecauseItRunsLong` | A signature past 80 characters collapses to `(…): string` |
| `finish` | A summary past 120 characters prints its opening sentence alone, unmarked — a whole sentence is a complete thought, and the `file:line` points at the rest |
| _(a single long sentence)_ | Cut on a word and marked `…`, because there is no boundary to find |

[`output/report.json`](../../output/report.json) carries every comment in full.
A machine reading it has no line width to respect.

## The deprecated frame

`legacyRender` carries `@deprecated` and heads a **second, shorter stack**,
marked `⚠ deprecated` on its `🚀` line.

It cannot sit inside the first stack: calling a deprecated member is an ESLint
error in this repository, so the only honest way to give the tag a frame is to
make the deprecated callable a root. Which is what a callable on its way out
would be anyway.

## Why this stack is seven deep

Annotations are read only for the frames a report actually prints — rendering a
type is the one genuinely costly thing the checker does, and reports touch a few
hundred frames out of thousands. So a shape has to sit inside a **reported**
stack to be demonstrated at all.

## Next

Nothing left — back to the [package guide](../../README.md#acting-on-a-finding), for what to do about a finding.
