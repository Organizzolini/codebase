# 🪜 Deep stack

**Eight frames, every one of which does something.**

## Run it

```bash
nx run callidescope-examples:examples
```

Then read the `DeepStackService.quote` stack in [`output/report.md`](../../output/report.md), summaries and all.

This breaches `maximumDepth` and the finding is still not a defect. Every layer
transforms the amount it was handed: validate, discount, tier, rate, tax,
currency, round. Delete any one and the price comes out wrong.

Read this beside [`forwarding-stack`](../forwarding-stack), which is the same
depth and the opposite verdict. That pair is the whole point of reporting depth
as a **question** rather than a violation.

## How to tell them apart

Read the `↳` summaries straight down the tree.

- Each frame says something **different** → the layering is real. The finding is
  about the design: does pricing need this many stages at all?
- A run of frames says the **same thing** → those layers are forwarding. Collapse
  them; it costs nothing.

The one thing not to do is raise `maximumDepth` to make it pass. A limit set to
today's worst stack is a ratchet; raising it converts a gate into a record of a
decision nobody made.

## Next

[forwarding stack](../forwarding-stack/README.md).
