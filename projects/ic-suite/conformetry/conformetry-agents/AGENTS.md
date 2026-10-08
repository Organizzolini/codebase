# @conformetry/agents

Agent skills for the conformetry toolchain, published from this repository and
installable by any workspace that uses conformetry.

## What lives here

- `skills/<skill-name>/SKILL.md` — one directory per skill, each self-contained.
- `testing/skills.unit.test.ts` — checks every shipped skill is structurally
  valid and that its links resolve.

There is no `src/`. This package ships documentation; its only TypeScript is the
test above, which is why it declares no `dependency-cruiser` or `oxlint` target.

## The constraint that shapes everything

`skills add` copies a skill **directory** into the consumer's agent skills
directory. There is no manifest, no `node_modules`, and nothing beside it. So:

- **A skill may not link outside its own directory.** A relative link to a
  sibling skill resolves here and dangles for anyone who installs only one. The
  test enforces this.
- **A bundled script may import only Node built-ins.** Workspace packages are
  unreachable twice over: they expose TypeScript sources needing a
  decorator-preserving loader, and pnpm's isolated `node_modules` blocks
  importing anything the skill does not declare. Capability an agent needs
  belongs in `conformetry-cli`, which the skills then name.

## Writing a skill here

Skills are model-invoked: omit `disable-model-invocation` and write a
`description` carrying the situations that should fire it, in the language an
agent would actually be prompted with. The description is the entire trigger
surface.

Content rules worth knowing before editing:

- **Describe the toolchain, not this workspace.** A table of this repository's
  generators would read as authoritative and be wrong everywhere else. Point at
  `conformetry templates` instead, which is correct in every workspace.
- **Cover both entrypoints.** The Nx plugin and the command-line host differ in
  ways that matter — most sharply, the Nx path requires every declared input and
  the command-line host requires none.
- Front matter needs a `name` matching the directory name and a `description`.
  The skills tool silently skips a skill missing either, so it fails by not
  existing rather than by reporting anything.

## Validating

```bash
pnpm exec nx run conformetry-agents:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=write
pnpm exec nx run conformetry-agents:typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=check
pnpm exec nx run conformetry-agents:test-code
```

Coverage is empty by nature here — there is no source to instrument — so the
corpus test is what protects the shipped output.
