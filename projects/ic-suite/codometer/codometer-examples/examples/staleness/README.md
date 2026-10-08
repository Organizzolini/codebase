# ♻️ `--check reports` and false staleness

`--check reports` compares a committed report against a fresh measurement, so it
is only as stable as the numbers it re-measures — and compressed sizes are not
stable across machines.

## Run it

```bash
cp -R examples/corpus /tmp/stale
cd /tmp/stale
codometer --config <path-to>/examples/staleness/codometer.config.ts --output-json
codometer --config <path-to>/examples/staleness/codometer.config.ts --check reports
echo $?   # 0

# Stand in for a different Node release's zlib. Nothing in the tree changes.
jq '(.targets[].metrics[] | select(.path == "size") | .value) += 1' \
  codometer-report.json > patched.json
mv patched.json codometer-report.json

codometer --config <path-to>/examples/staleness/codometer.config.ts --check reports
echo $?   # 1 — "Found stale reports"
```

## What is here

```text
staleness/
└── codometer.config.ts    a size-carrying report, which is what makes this possible
```

The bundled zlib differs between Node releases, so a report written on one
runtime and checked on another reads as **stale when nothing changed at all**.

The failure names a size that moved and looks exactly like a real regression,
which is why it is worth reproducing rather than only warning about. The
reproduction above stands in for the runtime difference by editing the number
the other runtime would have produced.

## What to take from it

Check on the runtime the repository pins, or expect a false finding rather than
a real one. A report carrying no size at all never meets this: every other
metric is a count, and counts do not move between runtimes.

This is also why this repository gates a branch on `limits` rather than
`reports` — see
[gating a pull request](../../README.md#gating-a-pull-request-on-it).

## Next

Back to the [package guide](../../README.md#gating-a-pull-request-on-it), for
wiring all of this into a pull request.
