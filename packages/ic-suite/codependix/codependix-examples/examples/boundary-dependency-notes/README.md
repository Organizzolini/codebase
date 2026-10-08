# 🗒️ A dependent is told, not failed

A project that merely depends on a project with a boundary finding is not failed: the finding is reported as a note against the dependency, and the run stays green.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## A dependent of a cycle is told, not failed

The workspace is the one in [`boundary-cycles`](../boundary-cycles/README.md). `shop-web` depends on `shop-checkout`, so both halves of the cycle are built — but neither is judged. The finding is reported under the dependency it lives in, marked `note`. The exit code is `0`. `shop-web` cannot fix it, and it did not break `shop-web`.

```text
judged:  shop-web
built:   shop-checkout, shop-pricing, shop-web
exit:    0

Judged projects: shop-web.

#### shop-checkout

- **note** nxProjects in dependency shop-checkout, shop-pricing, not failing: no-project-cycles: shop-checkout → shop-pricing → shop-checkout is a cycle. Projects that depend on each other cannot be built apart.

#### shop-pricing

- **note** nxProjects in dependency shop-checkout, shop-pricing, not failing: no-project-cycles: shop-checkout → shop-pricing → shop-checkout is a cycle. Projects that depend on each other cannot be built apart.
```

## Naming a project on the cycle makes it a failure

The same finding with `shop-pricing` named as well. A finding fails the run when any project it is charged to is judged, and this one is charged to `shop-pricing`.

```text
judged:  shop-pricing, shop-web
built:   shop-checkout, shop-pricing, shop-web
exit:    1

Judged projects: shop-pricing, shop-web.

#### shop-checkout

- **fail** nxProjects shop-checkout, shop-pricing: no-project-cycles: shop-checkout → shop-pricing → shop-checkout is a cycle. Projects that depend on each other cannot be built apart.

#### shop-pricing

- **fail** nxProjects shop-checkout, shop-pricing: no-project-cycles: shop-checkout → shop-pricing → shop-checkout is a cycle. Projects that depend on each other cannot be built apart.
```

## `--no-dependencies` never builds the dependencies at all

Only `shop-web` is built, so the cycle behind it is not in the graph and there is nothing to note. Charging still works as before — a finding in a project that is built is charged to the projects that own it — but a dependency left out of the build cannot have a finding.

```text
judged:  shop-web
built:   shop-web
exit:    0

Judged projects: shop-web.

No boundary findings.
```

## How a note reads in the log

The line is the one the Markdown bullet above carries, with the verdict dropped: `in dependency` names where the finding lives and `not failing` says why the run is still green. A container that cannot boot is worded the same way — see [`boundary-boot-failures`](../boundary-boot-failures/README.md).

```text
nxProjects in dependency shop-checkout, shop-pricing, not failing: no-project-cycles: shop-checkout → shop-pricing → shop-checkout is a cycle. Projects that depend on each other cannot be built apart.
```

## Next

[boundary-boot-failures](../boundary-boot-failures/README.md).
