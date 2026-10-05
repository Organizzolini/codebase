<!-- callidescope:start -->

# 🔭 Callidescope

| Measure | Value |
| --- | --- |
| Callables | 365 |
| Files | 143 |
| Calls traced | 322 |
| Call stacks | 107 |
| Deepest stack | 9 |
| Stacks through recursion | 1 |
| Unfollowable calls | 21 |

## Projects

| Project | Deepest | Limit | Headroom | Widest |
| --- | --- | --- | --- | --- |
| `packages/ic-suite/callidescope/callidescope-examples` | 8 | 5 | -3 | 2 |
| `packages/ic-suite/callidescope/callidescope-examples/examples/gated-leaf` | 4 | 3 | -1 | 3 |
| `packages/logging` | 5 | 4 | -1 | 2 |
| `packages/ic-suite/codependix/codependix-configuration` | 7 | 7 | 0 | 4 |
| `packages/ic-suite/codometer/codometer-configuration` | 9 | 9 | 0 | 4 |
| `packages/ic-suite/callidescope/callidescope-configuration` | 7 | 8 | 1 | 7 |
| `packages/ic-suite/codependix/codependix-core` | 0 | 1 | 1 | 0 |
| `packages/ic-suite/codometer/codometer-core` | 0 | 1 | 1 | 0 |
| `packages/ic-suite/callidescope/callidescope-core` | 0 | 17 | 17 | 0 |

## Depth headroom

| Headroom | Projects |
| --- | --- |
| over limit | 3 |
| 0 — at limit | 2 |
| 1 | 1 |
| 2–3 | 0 |
| 4+ | 0 |
| no stacks | 3 |

## Call stacks over the depth limit (7)

**1. `ComputedMemberService.dispatch`** — depth ≥ 8 · orphan-root

```text
🚀 ComputedMemberService.dispatch(format: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:60]
   ↳ Dispatches a report request to a handler named at runtime.
  └─> ComputedMemberService.read(format: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:43]
     ↳ Reads the request's format and passes it on.
    └─> ComputedMemberService.normalize(format: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:33]
       ↳ Normalizes the requested format before anything routes on it.
      └─> ComputedMemberService.route(format: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:48]
         ↳ Routes the request one layer further down.
        └─> ComputedMemberService.select(format: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:53]
           ↳ Selects the branch that prepares the format.
          └─> ComputedMemberService.prepare(format: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:38]
             ↳ Prepares the format string the handler table is keyed by.
            └─> ComputedMemberService.choose(format: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:28]
               ↳ Chooses a handler by name.
              └─> ComputedMemberService.apply(format: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/computed-member/computed-member.ts:23]
                 ↳ Applies the selected handler, whichever one that turns out to be.
```

**2. `DeepStackService.quote`** — depth 8 · orphan-root

```text
🚀 DeepStackService.quote(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:50]
   ↳ Quotes one order, priced through every stage below.
  └─> DeepStackService.validate(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:43]
     ↳ Rejects a negative amount before anything else reads it.
    └─> DeepStackService.removeDiscount(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:33]
       ↳ Removes the tier discount from the validated amount.
      └─> DeepStackService.resolveTier(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:38]
         ↳ Picks the pricing tier the discounted amount falls into.
        └─> DeepStackService.loadRate(amount: number, tier: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:28]
           ↳ Looks up the tax rate the resolved tier pays.
          └─> DeepStackService.applyTax(amount: number, rate: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:18]
             ↳ Adds tax at the resolved rate.
            └─> DeepStackService.convertCurrency(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/deep-stack/deep-stack.ts:23]
               ↳ Converts to the reporting currency and rounds through the shared tail.
              └─> roundToCents(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/shared-tail/round-to-cents.ts:8]
                 ↳ The tail two of this package's deep stacks share.
```

**3. `ForwardingStackService.handle`** — depth 8 · orphan-root

```text
🚀 ForwardingStackService.handle(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:53]
   ↳ Handles one amount, through six layers that do nothing to it.
  └─> ForwardingStackService.process(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:41]
     ↳ Forwards, unchanged.
    └─> ForwardingStackService.execute(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:21]
       ↳ Forwards, unchanged.
      └─> ForwardingStackService.forward(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:31]
         ↳ Forwards, unchanged.
        └─> ForwardingStackService.perform(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:36]
           ↳ Forwards, unchanged.
          └─> ForwardingStackService.relay(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:46]
             ↳ Forwards, unchanged.
            └─> ForwardingStackService.finish(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/forwarding-stack/forwarding-stack.ts:26]
               ↳ Rounds the amount, which is the only work on this path.
              └─> roundToCents(amount: number): number [packages/ic-suite/callidescope/callidescope-examples/examples/shared-tail/round-to-cents.ts:8]
                 ↳ The tail two of this package's deep stacks share.
```

<details>
<summary>4 more call stacks</summary>

**4. `FrameAnnotationsService.trace`** — depth 7 · orphan-root

```text
🚀 FrameAnnotationsService.trace(value: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:95]
   ↳ Traces one value through every annotation shape below.
  └─> FrameAnnotationsService.render(value: number | string): string | string[] [packages/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:88]
     ↳ Renders one value for display, in the form its type calls for.
    └─> FrameAnnotationsService.summarize(rendered: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:27]
       ↳ Collapses a rendered value to something a description can quote.
      └─> FrameAnnotationsService.describe({ count, name }: DescribeArguments): string [packages/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:64]
         ↳ Describes a value from a parameter with no name at all in the syntax.
        └─> FrameAnnotationsService.compose(description: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:33]
           ↳ Joins the parts a description was built from.
          └─> FrameAnnotationsService.collapseThisSignatureBecauseItRunsLong(…): string [packages/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:53]
             ↳ Takes three parameters whose rendered signature runs past eighty characters, so the printed frame collapses it to `(…):…
            └─> FrameAnnotationsService.finish(description: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/frame-annotations/frame-annotations.ts:43]
               ↳ Finishes the chain and hands back what the layers above it built.
```

**5. `ProjectDepthLimitService.judge`** — depth 6 · orphan-root

```text
🚀 ProjectDepthLimitService.judge(project: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:45]
   ↳ Judges one project, through every stage a resolved limit passes.
  └─> ProjectDepthLimitService.resolveConfiguration(project: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:38]
     ↳ Names the configuration file the project is judged by.
    └─> ProjectDepthLimitService.readLimit(project: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:28]
       ↳ Reads the limit whichever configuration file the project settled on.
      └─> ProjectDepthLimitService.applyLimit(project: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:18]
         ↳ Applies the limit the resolved project turned out to declare.
        └─> ProjectDepthLimitService.reportVerdict(verdict: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:33]
           ↳ States the verdict, and where the number behind it came from.
          └─> ProjectDepthLimitService.readDeclaringFile(project: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/project-depth-limit/project-depth-limit.ts:23]
             ↳ Reads the file the number the verdict used was written in.
```

**6. `LoggerService.log`** — depth 5 · orphan-root

```text
🚀 LoggerService.log(message: unknown, context?: string, data?: LogData): void [packages/logging/src/modules/logger/logger.service.ts:292]
   ↳ Logs an informational message at the `info` level.
  └─> LoggerService.info(message: unknown, context?: string, data?: LogData): void [packages/logging/src/modules/logger/logger.service.ts:276]
     ↳ Logs an informational message at the `info` level.
    └─> LoggerService.buildBindings(…): Record<string, unknown> [packages/logging/src/modules/logger/logger.service.ts:158]
       ↳ Assembles the object pino merges into the line.
      └─> LoggerService.assertConventionalMessage(args: { context: string | undefined; parsed: ParsedLogMessage; }): void [packages/logging/src/modules/logger/logger.service.ts:125]
         ↳ Fails a malformed message in development, and never in production.
        └─> LoggerService.isConventionalVerb(word: string): boolean [packages/logging/src/modules/logger/logger.service.ts:183]
           ↳ Whether a word is a verb in one of the two tenses the convention allows.
```

**7. `GatedLeafService.read`** — depth 4 · declared

```text
🚀 GatedLeafService.read(key: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:40]
   ↳ The address this project declares as its entry point.
  └─> GatedLeafService.parse(key: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:27]
     ↳ First of the three, and the way into the chain.
    └─> GatedLeafService.normalize(key: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:22]
       ↳ Second of the three, one hop from the end.
      └─> GatedLeafService.finish(key: string): string [packages/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:17]
         ↳ Ends the chain, which is where the fourth frame is.
```

</details>

## Callables over the breadth limit (1)

| Callable | Breadth | Calls directly | Location |
| --- | --- | --- | --- |
| `GatedLeafService.read` | 3 | `GatedLeafService.parse`, `GatedLeafService.normalize`, `GatedLeafService.finish` | `packages/ic-suite/callidescope/callidescope-examples/examples/gated-leaf/gated-leaf.ts:40` |

<!-- callidescope:end -->
