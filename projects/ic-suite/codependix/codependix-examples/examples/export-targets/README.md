# 🎯 All four export targets

The same graph delivered at each of the four export targets, and the property that explains why `both` is named rather than inferred.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## `target: "none"`

Files created or changed, against a scratch project that already held a `README.md` carrying the `example-nx` anchor.

```text
(nothing written)
```

## `target: "json"`

Files created or changed, against a scratch project that already held a `README.md` carrying the `example-nx` anchor.

```text
codependix-nx-graph.json
```

## `target: "markdown"`

Files created or changed, against a scratch project that already held a `README.md` carrying the `example-nx` anchor.

```text
README.md
```

## `target: "both"`

Files created or changed, against a scratch project that already held a `README.md` carrying the `example-nx` anchor.

```text
codependix-nx-graph.json
README.md
```

## A configured destination the target leaves unwritten

The `json` destination is configured and the target is `markdown`, so nothing is written to it. This is why `both` is a named target rather than something inferred from which destinations are present: a project can keep a destination in place without writing it yet.

```text
README.md
```

## Next

[markdown-modes](../markdown-modes/README.md).
