# @callidescope/agents

Agent skills for the callidescope toolchain, published from this repository and
installable by any workspace that uses callidescope.

## What lives here

- `skills/<skill-name>/SKILL.md` — one directory per skill, each self-contained.
- `testing/skills.unit.test.ts` — checks every shipped skill is structurally
  valid and that its links resolve.

There is no `src/`. This package ships documentation; its only TypeScript is
the test above, which is why it declares no `dependency-cruiser` or `oxlint`
target.

## The constraint that shapes everything

`skills add` copies a skill **directory** into the consumer's agent skills
directory. There is no manifest, no `node_modules`, and nothing beside it. So:

- **A skill may not link outside its own directory.** A relative link to a
  sibling skill resolves here and dangles for anyone who installs only one.
  The test enforces this, which is why the three skills refer to each other by
  name in prose rather than by link.
- **A bundled script may import only Node built-ins.** Workspace packages are
  unreachable twice over: they expose TypeScript sources needing a
  decorator-preserving loader, and pnpm's isolated `node_modules` blocks
  importing anything the skill does not declare. Capability an agent needs
  belongs in `callidescope-cli`, which the skills then name.

## Writing a skill here

Skills are model-invoked: omit `disable-model-invocation` and write a
`description` carrying the situations that should fire it, in the language an
agent would actually be prompted with. The description is the entire trigger
surface.

Content rules worth knowing before editing:

- **Describe the toolchain, not this workspace.** A table of this repository's
  configured limits, or of the Nx targets that run them, would read as
  authoritative and be wrong everywhere else. Limits are written as examples
  and as defaults, never as this repository's own numbers, and every command
  is written as the bare CLI rather than as an Nx target.
- **Never present raising a limit as a fix.** Callidescope's worst outcome is a
  depth gate answered by moving `maximumDepth` up to today's worst stack, which
  makes the gate stop gating and hands every later stack a free pass to the new
  number. Every skill that touches a failure says so.
- **Never suggest hand-editing inside the report markers.** The next `--write`
  replaces a block wholesale, so an edited report is a diff that silently
  disappears. Re-running `--write` is the whole fix for a stale `--check`.
- **`depth` and `reports` belong on opposite sides of a pull request**, and
  saying why is load-bearing rather than trivia: an agent that gates staleness
  on a pull request has built something that fails for drift nobody caused.
- **A depth printed with `≥` is a floor, not a defect.** An agent that reads it
  as a bug goes looking for something to fix that is not there.
- Front matter needs a `name` matching the directory name and a `description`.
  The skills tool silently skips a skill missing either, so it fails by not
  existing rather than by reporting anything.

## Where the line between the three falls

`conformetry-agents`, `codometer-agents`, and `codependix-agents` each split by
the moments of using a gate: run it, configure it, act on what it said.
`callidescope-trace`, `callidescope-configure`, and `callidescope-triage`
are those three, and the two boundaries that are easy to get wrong are worth
stating.

**`depth <address>` and `breadth <address>` belong with the trace, not on their
own.** They gate nothing and report on no workspace, which is a real
difference — but reading one callable's callers and reading a whole workspace's
stacks are the same act of reading a call graph, described by the same
resolution rules, and an agent asking "what would this rename touch" is asking
to read one rather than to configure anything. An earlier draft gave them a
fourth skill; folding them back in keeps one description covering every way of
reading the graph instead of splitting that trigger surface in two.

**Every flag lives in `callidescope-configure`, including the three that
`depth` and `breadth` accept.** A flag is a way of telling callidescope what to
do whichever command carries it, and `--check`, `--write`, and `--directories`
cannot be explained without the configuration fields they read — `--check
breadth` weighs each project against its own declared `limits.maximumBreadth`.
Splitting flags
from the file they layer over would mean neither half was usable alone.

## Validating

```bash
pnpm exec nx run callidescope-agents:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=write
pnpm exec nx run callidescope-agents:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=check
pnpm exec nx run callidescope-agents:test-code
```

Coverage is empty by nature here — there is no source to instrument — so the
corpus test is what protects the shipped output.

## Why the corpus test is copied, not shared

`testing/skills.unit.test.ts` is identical, byte for byte, to the ones in
[`conformetry-agents`](../../conformetry/conformetry-agents/testing/skills.unit.test.ts),
[`codometer-agents`](../../codometer/codometer-agents/testing/skills.unit.test.ts), and
[`codependix-agents`](../../codependix/codependix-agents/testing/skills.unit.test.ts). That
is deliberate rather than an oversight, and
[`codometer-agents/AGENTS.md`](../../codometer/codometer-agents/AGENTS.md) is where the
reasoning lives — this package takes a fourth copy on the same terms. Do not
extract it into a shared package without changing that decision there first.
