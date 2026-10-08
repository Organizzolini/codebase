# 🔀 The `--output-*` / `--check` matrix

`--output-json`, `--output-markdown`, and `--check` are independent, and no
combination is inferred. Each `--output-*` flag writes its own destination —
bare, wherever the configuration says to. This is the whole surface, and it
replaces the single `--write` flag this schema removed.

## Run it

```bash
cd examples/corpus
codometer --config ../write-check/codometer.config.ts --output-json --output-markdown --check limits
```

## What is here

```text
write-check/
└── codometer.config.ts    one breaching limit, so every row has something to report
```

| Invocation | Writes | Fails on staleness | Fails on a breach | Exit |
| ---------- | ------ | ------------------ | ----------------- | ---- |
| `codometer` | no | no | no | 0 |
| `codometer --check limits` | no | no | yes | 1 |
| `codometer --check reports` | no | yes | no | 0 |
| `codometer --check reports,limits` | no | yes | yes | 1 |
| `codometer --output-json --output-markdown` | yes | no | no | 0 |
| `codometer --output-json --output-markdown --check limits` | yes | no | yes, after writing | 1 |

Every row is run against a scratch copy of the corpus by the test beside these
files, with the exit code above and the files on disk checked afterwards. The
last row is the one worth trying yourself: **the report is on disk even though
the run exits 1**, because a pull request that failed the gate is exactly the
one that needs the numbers.

A bare run reports a breach and exits 0. A breach is a finding; only
`--check limits` turns a finding into a gate.

## Two command lines refused before anything is measured

```text
--output-json or --output-markdown cannot be combined with --check reports: a
report cannot be stale in the run that just wrote it. Drop --check reports, or
run it separately from the run that writes.
```

```text
--check does not accept "everything". It takes a comma-separated set drawn from
"limits" and "reports", as in "--check limits,reports".
```

## Next

[output](../output/README.md), for where a written report actually lands.
