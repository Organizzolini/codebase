# 📤 The output sinks

Where a run's output lands. What a run prints and what it writes are asked for
separately, and each sink is independently replaceable.

## Run it

```bash
cd examples/corpus
codometer --format json | jq '.targets[0].files'   # 28
```

## What is here

```text
output/
├── codometer.config.ts          a configured report and document pair
├── renamed-markers.config.ts    a document that explains the default markers
├── custom-render.config.ts      a `write` that builds its own content, splicing the built-in writer
├── custom-write.config.ts       a `write` that picks its own destination
└── self-excluded.config.ts      what a run writes, it does not measure
```

| Sink | Flag | What lands there |
| ---- | ---- | ---------------- |
| Console | `-f, --format <format>` | the report as `json`, or the badges as `markdown` |
| Report | `--output-json [path]` | the structured report |
| Markdown | `--output-markdown [path]` | the badge block, in a markdown file |

A path always names a file, never the console. Passed with no value, each
`--output-*` flag writes wherever the configuration's matching `outputs` entry
says to. `--format` defaults to the resolved configuration's own `format` —
`markdown` for every example here — on a run that touches no file, which is
what a bare `codometer` does.

## Standard output carries the result

**Every diagnostic goes to standard error**, so the report survives a pipe, log
lines and all. The test proves it by taking the bytes the run wrote to standard
output — and only those — and feeding them to a second process that parses them.
One warning sharing the stream would break it.

**The markdown sink writes the badge block into a file**, which serves a page
that is nothing but statistics as readily as a README with prose around it:

```bash
cd examples/corpus
codometer --output-markdown document.md
```

## A bare flag needs a configured entry to resolve

**A path always writes — no companion flag needed.** `--output-json <path>` or
`--output-markdown <path>` writes there outright, replacing the old
`--write`/`--output-json <path>` pairing this schema removed. Only the **bare**
form — the flag passed with no value, asking the run to write wherever its
configuration says to — can still be refused, and only when that configuration
names no matching entry in its `outputs` to resolve one from:

```text
--output-json needs a path, or a "json" entry in the configuration's "outputs"
to resolve one from: neither was found, so there is nowhere to write it. Pass
--output-json <path>, or declare a "json" output.
```

Asking for the console is `--format json`, which names no file and so is never
refused.

**A named destination stands for all of them.** `--output-json only-this.json`
against [`codometer.config.ts`](codometer.config.ts) writes the report and
**not** the configured markdown file. Adding to the configured set instead
would write a file the command line never asked for.

## One markdown sink, not two

`--output-markdown` splices the block between `<!-- codometer:start -->` and
`<!-- codometer:end -->` unless a configuration renames them. It is **appended
with its markers when they are absent** and the **file is created when it does
not exist**, so a destination needs nothing in it beforehand; a second run
rewrites the block in place rather than appending another. A README somebody
else wrote the rest of and a file holding nothing but badges are the same case,
so neither needs a flag of its own.

[`renamed-markers.config.ts`](renamed-markers.config.ts) renames them, and the
reason is not cosmetic: a document that _explains_ the default markers holds the
default start marker in its own prose, so codometer reads it as already carrying
the block and rewrites the wrong region. This package's own README renames its
markers for exactly that reason, and so does the codometer README.

## One `write` function, not two callbacks

The old `render` and `write` callbacks — one deciding what markdown got
produced, the other deciding where it landed and how — are now **one**
function: `write(args) => boolean`, handed `anchors`, `check`, `description`,
`path`, `renderBadges()`, and `statistics`. Leaving it unset keeps the built-in
rendering and writing; supplying it takes over both, though a custom `write`
can still call the handed `renderBadges()` and `anchors.syncAnchoredBlock` to
reuse either half.

- [`custom-render.config.ts`](custom-render.config.ts) builds its own content —
  a line above the badges, then `renderBadges()`, the built-in rendering of
  those same statistics — and hands the result to
  `anchors.syncAnchoredBlock({ content })`, which is the splice the built-in
  writer would have done anyway.
- [`custom-write.config.ts`](custom-write.config.ts) picks the destination from
  what was measured, calling `anchors.syncAnchoredBlock({ path })` with no
  `content` override so the default badge block is what lands there.

The console is not one of the halves a `write` takes over. `--format markdown`
prints the **built-in** badges whatever a configuration's `write` renders,
because a preview must not call a side-effecting callback to produce its own
text — so under either configuration above, what the console shows and what the
file holds can legitimately differ.

One detail that costs an afternoon otherwise: **derive a custom writer's
destination from the `path` it was handed**, which is already resolved against
the process's working directory. A bare filename passed to
`syncAnchoredBlock` is not resolved the same way and lands relative to the
working directory the command was run from — for an Nx target, the workspace
root rather than the project.

## What codometer writes, it does not measure

[`self-excluded.config.ts`](self-excluded.config.ts)

Every file a run would write is left out of what it measures, with no
configuration and no ignore-file entry — codometer knows its own destinations —
and the run says so on the console:

```text
📊 Excluded the files codometer writes from what it measures
   { paths: ["codometer-report.json", "statistics.md"] }
```

The reason is circular otherwise. A badge is an image inside a link, so a
spliced block moves `markdown.images`, `markdown.links`, and `markdown.lines` —
which moves the badges, which moves the counts. A report left in would be stale
the moment it landed.

Run it twice against a scratch copy and read the report the second run wrote:

```bash
cp -R examples/corpus /tmp/copy
cd /tmp/copy
codometer --config <path-to>/examples/output/self-excluded.config.ts --output-json --output-markdown
codometer --config <path-to>/examples/output/self-excluded.config.ts --output-json --output-markdown
jq '.targets[0].files' codometer-report.json   # 28
```

Still 28, one markdown file, one JSON file — exactly what a run before either
file existed reported. The exclusion is applied identically whatever the flags
say, so an `--output-*` run and a `--check reports` run always measure the same
tree.

**Reading the report back does not change what is measured.** `--format json`
names no destination, so the configured pair stays excluded and the second run
reports the same 28. Naming a destination outright — `--output-json
only-this.json` — does replace the configured pair, and a run that was never
going to write those two files has no reason to exclude them.

## Next

[discovery](../discovery/README.md), for how a configuration is found in the
first place.
