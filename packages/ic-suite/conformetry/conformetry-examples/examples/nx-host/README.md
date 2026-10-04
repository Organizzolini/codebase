# 🧩 The Nx host

`@conformetry/nx` is a second host over the same runtime. It offers two things
the standalone command line cannot: a cached `conformetry-validate` target
inferred onto every project that holds instances, and instance groups that
select projects by **tag**. This example is a configuration written for it, and
a demonstration of what the command-line host does with one.

## Run it

```bash
pnpm exec nx run conformetry-examples:nx-host
```

```text
No instances were found. Check the instance globs in the configuration.
All checked files conform.
No instances belong to nx-module, so nothing was checked.
nx-module locates instances by project tag, which this host cannot resolve. Run validation through @conformetry/nx, or pass --instances with the paths to check.
```

That is the demonstration, not a failure. Both of this configuration's instance
groups are tag-scoped, and locating them needs a project graph: `src/modules/*`
is read _inside_ every `framework:nestjs` project, so it has no meaning at all
until a project root is joined to it.

The command-line host therefore **leaves a tag-scoped group alone rather than
expanding it from the directory it runs in**. That distinction matters more than
it looks. Globbing `src/modules/*` at the workspace root happens to match
nothing _here_ — but in a workspace that has a root-level `src/modules/`, it
would match whatever sits there and measure it against a template scoped to
entirely different projects. The group is not addressed to this host, so it is
not read by it.

The third command is what that looks like when you ask for the template by
name. A run with no template filter has a whole workspace to report on and says the
ordinary thing; a run narrowed to `nx-module` alone would otherwise render an empty
findings list as a clean report, so it says which template it could not locate
and which host can.

## The configuration

```ts
import { type ConformetryNxConfiguration } from "@conformetry/nx";

const conformetryConfiguration: ConformetryNxConfiguration = [
  {
    // …
    instances: [
      { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
      { tags: ["framework:react"] },
    ],
  },
];
```

Two things differ from every other example here:

- **The type.** `ConformetryNxConfiguration` rather than
  `ConformetryConfiguration`. `tags` is carried through uninterpreted by the
  configuration package, which has no notion of a host to match labels against;
  the Nx type is what makes a tag-scoped group check out.
- **The group forms.** `patterns` + `tags` selects projects and reads the globs
  inside each one, so where a generator belongs is stated exactly once. `tags`
  alone selects **without locating** — which is what a template with no
  instances yet wants: `nx g` is still confined to the projects the template
  suits, and validation measures nothing.

## What the Nx host adds

### Setup

```json
{
  "plugins": [
    {
      "plugin": "@conformetry/nx",
      "options": {
        "configurationPath": "configuration/conformetry.config.ts",
        "validateTargetName": "conformetry-validate"
      }
    }
  ],
  "sync": { "globalGenerators": ["@conformetry/nx:sync"] }
}
```

```json
{ "scripts": { "postinstall": "conformetry-nx-bootstrap-generators" } }
```

Which generators a workspace has is a property of _its_ configuration rather
than of the package, so the plugin exposing them is **emitted rather than
shipped**. `conformetry-nx-bootstrap-generators` derives it from the
configuration, writes it to `.conformetry/nx-generators` — a build artifact, so
git-ignore it — and links it into the root `node_modules` so
`nx g conformetry:<generator>` resolves. Nx resolves a generator's package prefix by requiring it by name, not
by matching an Nx project, which is why the link is what makes it addressable.

The bootstrap warns rather than exiting non-zero when the configuration cannot
be read, so a configuration mid-edit never blocks an unrelated install. Drift is
caught where it matters instead: every conformetry command compares the emitted
plugin against the configuration and refuses to run against a stale one. If Nx
says the `conformetry` collection is not installed, run `pnpm install` again.

### Inferred targets

This repository _is_ an Nx host, so the difference is visible without leaving
it. Every project that holds instances gets a target nobody wrote:

```bash
pnpm exec nx show project logger --json
```

Trimmed to the inferred target, which is what nobody wrote — a real run also
lists every other target the project has, and one input per template:

```json
{
  "cache": true,
  "executor": "@conformetry/nx:validate",
  "inputs": [
    "default",
    "{workspaceRoot}/configuration/conformetry.config.ts",
    "{workspaceRoot}/configuration/conformetry-templates/nestjs-service-module/**/*"
  ]
}
```

Because it is a real target with real inputs, validation is cached and joins
`nx affected`:

```bash
pnpm exec nx run logger:conformetry-validate
pnpm exec nx run-many --target=conformetry-validate --all
pnpm exec nx affected --target=conformetry-validate --base=main
```

| Executor option | Purpose |
| --------------- | ------- |
| `configurationPath` | Configuration file, workspace-root relative |
| `languages` | Restrict the run to named validators; all run when omitted |

### Generators by name

```bash
pnpm exec nx g conformetry:nestjs-service-module --name=billing --project=lexico
```

A generator is addressed by its full name. Nx prompts for missing inputs from
the generator's own schema and writes through its virtual `Tree`, so `--dry-run`
works and the workspace formatter runs over the result — which the standalone
`generate` does not do.

## Why this package is not itself validated by the Nx host

`conformetry-examples` deliberately carries no `framework:*` tag. This
repository's own instance groups are tag-scoped (`{ patterns: ["src/modules/*"],
tags: ["framework:nestjs"] }`), and a `framework:nestjs` tag here would have the
Nx host resolve those globs _inside this package_ — sweeping the deliberately
drifted fixtures into the repository's own conformance run and failing it. The
absence of that tag is what keeps
`nx run-many --target=conformetry-validate` green.

## Next

[embedding](../embedding/README.md), for a host of your own.
