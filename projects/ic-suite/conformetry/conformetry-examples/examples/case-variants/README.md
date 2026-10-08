# 🔠 Case variants

Every generator's `name` input is expanded into four case variants
automatically, in file **paths** and in file **contents** alike. This example
uses all four, and overrides one of them on purpose.

## Run it

```bash
pnpm exec nx run conformetry-examples:case-variants
```

```text
All checked files conform.
```

## What is here

```text
case-variants/
├── conformetry.config.ts
├── instances/
│   └── search-bar/
│       ├── SearchBar.md                        ← {{namePascalCase}}.md
│       └── search_bar.json                     ← {{nameSnakeCase}}.json
└── templates/
    └── case-variants/
        └── {{nameKebabCase}}/
            ├── {{namePascalCase}}.md
            └── {{nameSnakeCase}}.json
```

Three of the four variants name a path here, and all four appear inside the
files.

| Placeholder | `search bar` becomes |
| ----------- | -------------------- |
| `{{nameCamelCase}}` | `searchBar` |
| `{{nameKebabCase}}` | `search-bar` |
| `{{namePascalCase}}` | `SearchBar` |
| `{{nameSnakeCase}}` | `search_bar` |

## The override

`nameCamelCase` is declared as an input of its own:

```ts
inputs: {
  name: { description: "Component name in kebab-case", type: "string" },
  nameCamelCase: {
    description: "Camel-case name, overriding the derived variant",
    type: "string",
  },
  owner: { description: "Owning team", type: "string" },
}
```

An explicit value always wins over the derived variant, so the committed
instance says `spelledOutByHand` where `searchBar` would otherwise be — and
generation agrees, because it is passed the same value:

```bash
pnpm exec nx run conformetry-cli:start -- generate --template case-variants --name 'search bar' --nameCamelCase spelledOutByHand --owner platform --directory tmp/conformetry-examples/case-variants --config projects/ic-suite/conformetry/conformetry-examples/examples/case-variants/conformetry.config.ts
```

The result is byte-identical to `instances/search-bar/`, which this package's
test asserts rather than trusts.

## Two sides of the same substitution

Generation and validation render the same template with the same renderer, but
they are handed values from different places, and both have to agree:

| | Where a value comes from |
| --- | --- |
| `generate` | Flags on the command line, then interactive prompts |
| `validate` | The instance's own directory name, then the instance group's `substitutions` |

That is why the configuration carries `substitutions` for this group:

```ts
substitutions: { nameCamelCase: "spelledOutByHand", owner: "platform" }
```

Drop `owner` from there and rendering refuses outright, on both sides of the
loop — see [failure-modes](../failure-modes/README.md), which reproduces
exactly that and explains why it is an error rather than a finding.

## Next

[structural-not-textual](../structural-not-textual/README.md), for what the
comparison actually weighs once the substitutions are settled.
