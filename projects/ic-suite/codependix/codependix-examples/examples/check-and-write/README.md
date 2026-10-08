# 🔀 `--check` versus `--write`

What each `--check` name gates, what `--write` acts on, the command line codependix asks about, and the four it refuses outright.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## A current export, and the same export after it drifts

The first result is what `--check` reports for an export nothing has moved. The second names the exact paths that went stale, which is what a reader is given to act on.

```json
[
  {
    "isCurrent": true,
    "projectName": "atlas-service",
    "staleExports": [],
    "stalePaths": []
  },
  {
    "isCurrent": false,
    "projectName": "atlas-service",
    "staleExports": [
      {
        "anchor": "example-nx",
        "difference": "graph",
        "path": "README.md"
      }
    ],
    "stalePaths": [
      "README.md"
    ]
  }
]
```

## A command line naming no mode at all

At a terminal, a command line naming neither `--check` nor `--write` is asked which was meant, as a three-item menu — `boundaries`, `reports`, `write`. Where stdin is not a terminal the run fails with this instead: `prompts` would otherwise draw a menu nobody can answer, never resolve, and let the process exit 0 having done nothing.

```text
A run mode (--check or --write) is required, and stdin is not a terminal so it cannot be asked for.
```

## A `--check` carrying no value

`--check` names which finding fails the run, so a bare one is a mistake rather than a shorthand. Read as "gate nothing" it would be a gate that cannot fail — `--check "$GATES"` with the variable unset would pass forever over a workspace whose every rule was broken, which is worse than no gate at all because it looks like protection. A value of only separators is refused the same way.

```text
--check needs a value. It takes a comma-separated set drawn from "boundaries" and "reports", as in "--check boundaries,reports".
```

## A `--check` naming something it does not know

Every mistake on one command line is collected before any of them is reported, so two typos are two lines to fix rather than two runs. `limits` is codometer’s word and `depth` is callidescope’s; `reports` is deliberately the same word in all three, because a configured destination going stale is one finding rather than three.

```text
--check does not accept "limits". It takes a comma-separated set drawn from "boundaries" and "reports", as in "--check boundaries,reports".
--check does not accept "depth". It takes a comma-separated set drawn from "boundaries" and "reports", as in "--check boundaries,reports".
```

## `--write` together with `--check reports`

Refused, because an export cannot be stale in the run that just wrote it. `--write --check boundaries` is legal for the mirror-image reason: a boundary has no destination to be stale, so writing every export and judging every graph in one run is two independent things rather than a contradiction.

```text
--write cannot be combined with --check reports: an export cannot be stale in the run that just wrote it. Drop one of them, or run --write and --check reports separately.
```

## One project failing names itself and stops nothing

[container-rooting](../container-rooting) shows the same guarantee acting on three real containers, one of which refuses to load.

`GraphRunService.run` attempts every project regardless of whether an earlier one failed, collecting each failure as a `ProjectRunFailure` rather than aborting the loop. `MapCommand.reportOutcome` then reports the failures and the stale exports together, and fails the run if either list is non-empty. That is the whole of the guarantee: `--write` either fully succeeds, or names exactly which projects failed while still completing every other one.

## Next

[boundary-rules](../boundary-rules/README.md).
