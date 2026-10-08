# @codependix/agents

Agent skills for the codependix toolchain, published from this repository and
installable by any workspace that uses codependix.

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
  The test enforces this, which is why the four skills refer to each other by
  name in prose rather than by link.
- **A bundled script may import only Node built-ins.** Workspace packages are
  unreachable twice over: they expose TypeScript sources needing a
  decorator-preserving loader, and pnpm's isolated `node_modules` blocks
  importing anything the skill does not declare. Capability an agent needs
  belongs in `codependix-cli`, which the skills then name.

## Writing a skill here

Skills are model-invoked: omit `disable-model-invocation` and write a
`description` carrying the situations that should fire it, in the language an
agent would actually be prompted with. The description is the entire trigger
surface.

Content rules worth knowing before editing:

- **Describe the toolchain, not this workspace.** A table of this repository's
  configured anchor names or export destinations would read as authoritative
  and be wrong everywhere else. Configuration examples are written as examples,
  never as this repository's own.
- **Lead with the configuration, not with the command line.** Codependix's
  worst outcome is a run that exits 0 having written nothing, because a
  workspace with no configuration resolves every graph type to `target: "none"`.
  Nothing in the command's own output says so, so every skill that touches a
  run says it instead.
- **Never suggest hand-editing inside the anchor markers.** The next `--write`
  replaces a block wholesale, so an edited diagram is a diff that silently
  disappears. Re-running `--write` is the whole fix for a stale `--check`.
- **Never reach for conformetry to fix a codependix block.** The markers are
  codependix's own syntax and carry no dependency on any `conformetry-*`
  package, by the decision in #242.
- Front matter needs a `name` matching the directory name and a `description`.
  The skills tool silently skips a skill missing either, so it fails by not
  existing rather than by reporting anything.

## Why there are four skills and not three

`conformetry-agents` and `codometer-agents` each ship three, split by the three
moments of using a gate: run it, configure it, act on what it said.
`codependix-export`, `codependix-configure`, and `codependix-triage` are those
three.

`codependix-navigate` is the fourth because codependix's output is a standing
reference artifact rather than a pass/fail report — reading a committed graph to
scope a refactor is a use the other two toolchains have no equivalent of. It is
its own skill rather than a section inside `codependix-export` because a
`description` is a skill's entire trigger surface: "what depends on this project"
and "run the export" share no vocabulary, so one description covering both would
match neither well.

## Validating

```bash
pnpm exec nx run codependix-agents:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=write
pnpm exec nx run codependix-agents:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=check
pnpm exec nx run codependix-agents:test-code
```

Coverage is empty by nature here — there is no source to instrument — so the
corpus test is what protects the shipped output.

## Why the corpus test is copied, not shared

`testing/skills.unit.test.ts` is identical, byte for byte, to the ones in
[`conformetry-agents`](../../conformetry/conformetry-agents/testing/skills.unit.test.ts) and
[`codometer-agents`](../../codometer/codometer-agents/testing/skills.unit.test.ts). That is
deliberate rather than an oversight, and
[`codometer-agents/AGENTS.md`](../../codometer/codometer-agents/AGENTS.md) is where the
reasoning lives — this package takes another copy on the same terms. Do not
extract it into a shared package without changing that decision there first.
