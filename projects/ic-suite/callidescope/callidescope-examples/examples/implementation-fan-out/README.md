# 🌫️ Implementation fan-out

**`sink.emit(line)` → nothing, because nine candidates exceed a cap of eight**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read `unresolvedCallCount` in the `projects/ic-suite/callidescope/callidescope-examples` entry of [`output/report.json`](../../output/report.json)'s `projects`. It is 2: this dropped expansion, and the computed member name.

The top-level summary is higher, because the run measures this package's
dependency closure as well and real code has unfollowable calls of its own. Read
this package's own entry whenever a count is meant to be about a fixture — see
[`dependency-closure`](../dependency-closure) for why the run reaches further
than this package.

The implementation-candidate cap is the primary noise control on structural
matching. A member named `emit`, `run`, or `sync` matches dozens of unrelated
classes in a real workspace, and expanding all of them manufactures call stacks
no execution ever takes.

Past the cap the **whole expansion is dropped**, not narrowed to a favorite —
picking one would be a guess presented as a fact — and the call is recorded as
unfollowable, so the run says it happened rather than quietly under-reporting.

The cap is eight, a constant in
[`@callidescope/graph`](../../../callidescope-graph) rather than a configuration
field — it is not a limit a run judges anything against, it is where structural
resolution stops guessing, and no project has ever had a reason to vary it. Nine
near-identical sinks is therefore what demonstrating it costs.

Compare with [`structural-interface`](../structural-interface), where one
implementation sits under the cap and resolves.

## Next

[mutual recursion](../mutual-recursion/README.md).
