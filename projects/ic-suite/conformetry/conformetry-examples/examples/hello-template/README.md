# 👋 Hello template

The smallest generator that can exist: one template file, one input, one
instance glob. Nothing here is idiomatic — it is the shape everything else in
this package is built out of.

## Run it

```bash
pnpm exec nx run conformetry-examples:hello-template
```

```text
All checked files conform.
```

Then close the loop by hand: scaffold a new instance, and measure the thing you
just scaffolded against the template that produced it.

```bash
pnpm exec nx run conformetry-cli:start -- generate --template hello --name mars --directory tmp/conformetry-examples/hello-template --config projects/ic-suite/conformetry/conformetry-examples/examples/hello-template/conformetry.config.ts
```

```text
  tmp/conformetry-examples/hello-template/mars/mars.md
```

```bash
pnpm exec nx run conformetry-cli:start -- validate --config projects/ic-suite/conformetry/conformetry-examples/examples/hello-template/conformetry.config.ts --instances 'tmp/conformetry-examples/hello-template/*'
```

```text
All checked files conform.
```

`tmp/` is git-ignored, so delete it whenever you like.

## What is here

```text
hello-template/
├── conformetry.config.ts                      the generator, its input, its instances
├── instances/
│   └── world/
│       └── world.md                           what the template rendered once
└── templates/
    └── hello/
        └── {{nameKebabCase}}/
            └── {{nameKebabCase}}.md           the template
```

Three facts do all the work:

- **The template folder holds the folder it produces.** `hello` contains
  `{{nameKebabCase}}/`, so an instance of it is a _directory_ — and the path the
  template is laid over is that directory's parent, which is why the glob is
  `instances/*` rather than `instances`.
- **File paths are rendered too.** `{{nameKebabCase}}.md` becomes `world.md`,
  by the same mustache pass that renders file contents.
- **Nothing records where an instance came from.** `instances/world` is matched
  to the `hello` template because it already has the files `hello` describes.
  See [ambiguous-attribution](../ambiguous-attribution/README.md) for what
  happens when two templates fit equally well.

## Where the name comes from

The instance's own directory name. `instances/world` makes `world` the name
stem, and the four case variants are derived from it, so a template can write
`{{namePascalCase}}` and get `World` without anyone configuring anything.

That is also why the round trip above used `--name mars` and produced
`mars/mars.md`: generation is told the name, validation works it out.

## Next

[case-variants](../case-variants/README.md), for what else that name stem gives
you — and how to override it.
