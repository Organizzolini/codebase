import { projectDefaults } from "../../configuration/callidescope.config.js";

/**
 * What logging is held to, measured rather than assumed.
 *
 * Four frames, which is this package reaching its own transport. Every other
 * project's calls into it are excluded by the run — `excludeCallees` in
 * `configuration/callidescope.config.ts` names `LoggerService.*` — so what is
 * gated here is the logger judged on its own rather than as the callee sitting
 * behind everything else.
 *
 * That exclusion is also what makes it four rather than five: it cuts the edge
 * from `LoggerService.log` to the assertion beneath it. So a run configured
 * without it measures five and reports this package —
 * `projects/ic-suite/callidescope/callidescope-examples` is the one that does, deliberately, and its
 * committed report carries the finding. Four is still the right number here,
 * because the gate is run with the workspace configuration and nothing else
 * is.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * Two direct callees at the widest, tied between `checkConventionalMessage`
 * and its own `CallExpression` visitor in
 * `src/lib/conventional-log-message.eslint-rule.ts` — ordinary fan-out rather
 * than a closed enumeration, so the next helper anybody extracts here is what
 * moves the number.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 2,
    maximumDepth: 4,
  },
};
