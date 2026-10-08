# ↔️ The two directions

Two commands ask complementary questions about the same fixtures.
`conformetry templates --instances <path>` asks _what standard does this path
answer to_. `conformetry instances --templates <name>` asks _what generated code
exists_. Neither is derivable from the other, and this example runs both side by
side.

## Run it

```bash
pnpm exec nx run conformetry-examples:two-directions
```

### Instances → templates

```bash
pnpm exec nx run conformetry-cli:start -- instances --config projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/conformetry.config.ts
```

```text
  projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/instances/alpha
    Templates:
      card 2/2 files 100%
      panel 1/2 files 50%
  projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/instances/beta
    Templates:
      panel 2/2 files 100%
      card 1/2 files 50%
```

### Templates → instances

```bash
pnpm exec nx run conformetry-cli:start -- templates --config projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/conformetry.config.ts --instances projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/instances/alpha
```

```text
  card
    A card: the document and its back
    Template: projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/templates/card
    Instances:
      projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/instances/alpha 2/2 files 100%
  panel
    A panel: the document and its manifest
    Template: projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/templates/panel
    Instances:
      projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/instances/alpha 1/2 files 50%
```

## What is here

```text
two-directions/
├── conformetry.config.ts
├── instances/
│   ├── alpha/           alpha.md + card.md      — card-shaped
│   └── beta/            beta.md + panel.json    — panel-shaped
└── templates/
    ├── card/            {{nameKebabCase}}.md + card.md
    └── panel/           {{nameKebabCase}}.md + panel.json
```

Each template has one file the other does not, which is what makes attribution
decidable at all. Take that distinguishing file away and you get
[ambiguous-attribution](../ambiguous-attribution/README.md).

## Why both exist

| Command | The question | When you reach for it |
| ------- | ------------ | --------------------- |
| `templates --instances <path>` | Which templates explain this path? | You are about to edit a directory and want to know what it owes |
| `instances --templates <name>` | Which paths does this template explain? | You are about to change a template and want to know the blast radius |

Every path printed by one is usable as the argument to the other, so the two
compose without reformatting.

## Two details that surprise people

**A bare `templates` listing omits the instances.** They appear only when you
narrow by path, so the registry stays readable:

```bash
pnpm exec nx run conformetry-cli:start -- templates --config projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/conformetry.config.ts
```

**`--templates` narrows the pairing, not the search.** Ask for `card` only and
`beta` is still listed, with `card` at 50%, because `beta` is still an instance:

```bash
pnpm exec nx run conformetry-cli:start -- instances --config projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/conformetry.config.ts --templates card
```

```text
  projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/instances/alpha
    Templates:
      card 2/2 files 100%
  projects/ic-suite/conformetry/conformetry-examples/examples/two-directions/instances/beta
    Templates:
      card 1/2 files 50%
```

An instance that no named template explains at all drops out entirely.

Both commands also take `--json`, which is the form to reach for from a script.

## Next

[ambiguous-attribution](../ambiguous-attribution/README.md), for what these
listings look like when nothing wins.
