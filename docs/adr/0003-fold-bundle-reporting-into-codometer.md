# Fold bundle-size reporting into codometer as a general change report

`tools/reporting` existed for one reason — diff codometer's bundle-size
metrics against a `main` baseline and splice a `## 🎒 Bundles` section into a
pull request description — and contained nothing else. Now that every
metric codometer measures (not just bytes) needs the same diff-and-report
treatment, we deleted `tools/reporting` and moved its job onto codometer
itself: `projects/ic-suite/codometer/codometer-changes` owns diffing two reports,
`packages/codometer-markdown` owns rendering and splicing markdown (shared
with codometer-cli's existing README badge output), and `codometer-cli`
gained a `changes` command that composes both. A single `## ⏲️ Codometer`
section, grouped per project, replaces `## 🎒 Bundles`.

## Considered options

- **Generalize `tools/reporting` in place.** Rejected: the tool existed only
  to host the bundles report; keeping it as a separate project would leave
  codometer's own measurement and reporting split across two workspace
  locations for no reason once every metric is in scope, not just bytes.
- **One combined package for diffing and rendering.** Rejected: diffing is
  pure computation over two reports, rendering is markdown formatting and
  document I/O — the same split codometer-cli already draws between measuring
  and outputting, and codometer-cli's own `output-markdown` module can reuse
  the rendering half instead of duplicating byte/count formatting a second
  time.
- **Fold diffing and rendering into `codometer-cli` directly, no new
  packages.** Rejected: `codometer-configuration` already establishes the
  pattern of factoring codometer's concerns into their own packages rather
  than growing the CLI as one large monolith.

## Consequences

- `codometer-cli`'s `changes` command keeps `tools/reporting`'s forge-agnostic
  contract: it only reads and writes a local markdown file. The GitHub
  Actions workflow still fetches and posts the pull request body itself
  (`gh pr view` / `gh pr edit`) around it.
- `output-markdown` (README badges) moves onto `codometer-markdown` in the
  same change, retiring the deliberate formatting duplication between it and
  the old `bundle-markdown` module now that both live in the same dependency
  graph.
