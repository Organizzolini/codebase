# 📨 Forwarding stack

**Eight frames, six of which only pass the argument along.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read the `ForwardingStackService.handle` stack in [`output/report.md`](../../output/report.md) and count how many `↳` summaries repeat.

This is the finding the tool exists to surface, and it is invisible to anything
reading one file at a time. Every method here is a one-line delegation — the
least objectionable code there is. Only as a stack does it read as six frames of
pure overhead.

The tell is in the report itself: six consecutive frames whose `↳` summary is
the same sentence.

```text
🚀 ForwardingStackService.handle(amount: number): number
  └─> ForwardingStackService.process(…): number
     ↳ Forwards, unchanged.
    └─> ForwardingStackService.execute(…): number
       ↳ Forwards, unchanged.
      … four more …
```

Collapse them. Nothing is lost, because nothing was happening.

Compare with [`deep-stack`](../deep-stack): identical depth, opposite remedy.

## Next

[project depth limit](../project-depth-limit/README.md).
