# 🚫 Every refusal, with its reproduction

Every way codependix refuses a configuration or a command line, each with the reproduction that produces it — because a refusal is where a reader gets stuck.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## A `both` target with no `json` destination

Reproduced by `codependixConfigurationSchema.parse({"workspace":{"nxProjects":{"target":"both"}}})`.

```text
A "both" export target needs a json destination.
A "both" export target needs a markdown destination.
```

## A `json` target with no `json` destination

Reproduced by `codependixConfigurationSchema.parse({"workspace":{"nxProjects":{"target":"json"}}})`.

```text
A "json" export target needs a json destination.
```

## A `both` target with no `markdown` destination

Reproduced by `codependixConfigurationSchema.parse({"workspace":{"nxProjects":{"json":{"path":"graph.json"},"target":"both"}}})`.

```text
A "both" export target needs a markdown destination.
```

## A `markdown` target with no `markdown` destination

Reproduced by `codependixConfigurationSchema.parse({"workspace":{"nxProjects":{"target":"markdown"}}})`.

```text
A "markdown" export target needs a markdown destination.
```

## A `markdown` destination naming neither an anchor nor a path

Reproduced by `codependixConfigurationSchema.parse({"workspace":{"nxProjects":{"markdown":{},"target":"markdown"}}})`.

```text
A markdown destination needs an anchor, a path, or both — otherwise nothing names where the export goes.
```

## An explicitly named configuration file that does not exist

A path named on the command line must exist: a typo in a task runner's arguments should fail rather than quietly resolving every graph to `none`. A path that was _not_ named is searched for, and its absence is legal — see [configuration-resolution](../configuration-resolution).

```text
ConfigurationFileNotFoundError: Configuration file not found: <examples>/refusals/codependix.config.missing.ts
```

## A configuration file the loader cannot read

`SUPPORTED_CONFIGURATION_EXTENSIONS` covers `.cjs`, `.cts`, `.js`, `.json`, `.mjs`, `.mts`, and `.ts`. Anything else raises `UnknownConfigurationFileTypeError`.

```text
UnknownConfigurationFileTypeError: Unsupported configuration file type: <examples>/refusals/unsupported-type/codependix.config.yaml
```

## Next

[path-queries](../path-queries/README.md).
