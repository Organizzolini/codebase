# @codometer/agents

Agent skills for the codometer toolchain, published from this repository and
installable by any workspace that uses codometer.

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
  The test enforces this.
- **A bundled script may import only Node built-ins.** Workspace packages are
  unreachable twice over: they expose TypeScript sources needing a
  decorator-preserving loader, and pnpm's isolated `node_modules` blocks
  importing anything the skill does not declare. Capability an agent needs
  belongs in `codometer-cli`, which the skills then name.

## Writing a skill here

Skills are model-invoked: omit `disable-model-invocation` and write a
`description` carrying the situations that should fire it, in the language an
agent would actually be prompted with. The description is the entire trigger
surface.

Content rules worth knowing before editing:

- **Describe the toolchain, not this workspace.** A table of this repository's
  declared counters or `sizeLimit` values would read as authoritative and be
  wrong everywhere else.
- **Never suggest raising a limit to make a breach pass.** Codometer's own
  policy, not just this repository's — a limit exists to keep a promise about
  the codebase's shape, and every skill that touches limits says so.
- Front matter needs a `name` matching the directory name and a `description`.
  The skills tool silently skips a skill missing either, so it fails by not
  existing rather than by reporting anything.

## Validating

```bash
pnpm exec nx run codometer-agents:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=write
pnpm exec nx run codometer-agents:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=check
pnpm exec nx run codometer-agents:test-code
```

Coverage is empty by nature here — there is no source to instrument — so the
corpus test is what protects the shipped output.

## Why the corpus test is copied, not shared

This section is the canonical statement of that decision; every other agent
package points here rather than restating it.

`testing/skills.unit.test.ts` is identical, byte for byte, to the ones in
[`conformetry-agents`](../../conformetry/conformetry-agents/testing/skills.unit.test.ts) and
[`codependix-agents`](../../codependix/codependix-agents/testing/skills.unit.test.ts). That
duplication is a deliberate choice rather than an oversight: each agent package
is a standalone, installable unit whose only dependency should be what its own
`package.json` declares, and every copy stays small enough — one file, under
150 lines — that drift between them is easy to spot in review. `jscpd` runs
advisory only (`nx run codebase:jscpd`, `|| true`, nothing in CI calls it), so
this is not a gate any copy needs to clear.
