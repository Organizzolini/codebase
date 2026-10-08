# 🌀 Computed member

**`REPORT_HANDLERS[format]()` → nothing, recorded as unfollowable**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read the `depth ≥ 8` floor on `ComputedMemberService.dispatch` in [`output/report.md`](../../output/report.md).

The member name is a value rather than a name in the syntax, so nothing about
the call site says which handler runs. Callidescope records the call as
unfollowable instead of guessing.

That is what turns a depth into a floor. This stack prints:

```text
🚀 ComputedMemberService.dispatch(format: string): string — depth ≥ 8
```

`≥ 8` is honest in both directions. Reporting `8` would claim a ceiling that
does not exist — the selected handler may go deeper still. Reporting nothing
would hide a stack that is already too deep at the point it goes dark.

One of this package's two unfollowable calls is here. The other is in
[`implementation-fan-out`](../implementation-fan-out).

## Next

[implementation fan out](../implementation-fan-out/README.md).
