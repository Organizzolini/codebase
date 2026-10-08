# Examples package standard

Four packages exist for one reason: a toolchain's behavior should be somewhere a
reader can **run** rather than only somewhere they can read about. They are
[callidescope-examples](../projects/ic-suite/callidescope/callidescope-examples),
[codependix-examples](../projects/ic-suite/codependix/codependix-examples),
[codometer-examples](../projects/ic-suite/codometer/codometer-examples), and
[conformetry-examples](../projects/ic-suite/conformetry/conformetry-examples), and they share one
shape so that understanding any one of them predicts the others.

A fifth such package conforms to the same shape. Nothing checks this
mechanically — it is enforced by review, deliberately, so the list below is the
authority.

| Concern | The standard |
| ------- | ------------ |
| Per-example guide | Every directory under `examples/` carries a `README.md`: `# <emoji> Title`, a one- or two-sentence summary of what the example demonstrates, `## Run it` with the exact command and what it prints, the explanation, then `## Next` linking to the next example in reading order |
| Root `README.md` | Title, bold claim, why the package exists, a runnable command block, a `## The examples` index table linking every guide, the tool-specific body, `## Layout`, `## Test`, `## License`, then the committed tool sections. One short section may precede `## The examples` where reading any example depends on it — callidescope's `## How to read a stack` is the case |
| `AGENTS.md` | `# <emoji> <Tool> Examples — Agent Guide`, `## Run one`, `## <Tool> said X — open this example` holding the lookup table, `## Layout`, `## Adding an example`, `## Do not fix a deliberately broken example`, `## Key files`. Those seven keep that relative order and that exact wording; a package may interleave sections of its own between them |
| Aggregate target | One target named `examples`, carrying a `description` that says what a failure means. Where committed output is really rendered the target is a `check`/`write` pair with `defaultConfiguration: check`, so a bare run never rewrites what is committed — callidescope and codependix are those two. Where there is nothing to regenerate the target takes no configurations at all, because a lone `check` that has no `write` to be distinguished from is a flag nobody can be wrong about — codometer and conformetry are those two |
| Test file | The suite asserting the guides is `examples.integration.test.ts`. Additional suites may sit beside it. Integration, not unit or end-to-end: these spawn a real command line or read real files, and neither reaches a network or a database |
| Metadata | `implicitDependencies` names the toolchain's command-line host; `framework:nestjs` where NestJS is a real runtime dependency; toolchain packages in `dependencies` rather than `devDependencies`. No package carries a `.gitignore` holding only a comment — everything these packages write is already ignored at the workspace root, so a placeholder file is noise that reads like a rule |
| Completeness | An example added without a guide, an index-table row, or a test expectation must fail something. Each package does this its own way, and every one of the four checks the `examples/` directory listing against both its guides and its root `README.md` index |

## Three deliberate asymmetries

So they do not read as drift:

- **`callidescope-examples` has a `src/`.** The `module-bootstrap` and
  `exported-function` entry-point rules key on the literal paths `src/main.ts`
  and `src/index.ts`, so those two fixtures cannot live under `examples/`.
- **`codependix-examples` renders its per-example guides** from the real graph
  builders rather than having them hand-written. That is a stronger guarantee
  than the other three have, and the one thing here worth spreading rather than
  levelling down.
- **`conformetry-examples` also has one Nx target per example.** They are the
  commands its guides name, and four of them exit non-zero on purpose — which is
  why its `examples` target checks each against the outcome its guide promises
  instead of running them as a batch.

## Every one of these packages contains code that is deliberately wrong

A breaching limit, a `tsconfig.json` the compiler cannot parse, a stack eight
frames deep, an instance missing an export, an interpreter that is not
installed. Each is the reproduction of a failure a reader will hit, and "fixing"
one deletes the only place that behavior is demonstrated. Each package's
`AGENTS.md` lists its own.
