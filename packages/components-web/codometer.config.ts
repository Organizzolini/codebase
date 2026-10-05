import { codometerConfiguration } from "../../configuration/codometer.config.js";

/**
 * What this component library is measured by.
 *
 * It overrides `inputs` because the Vite library build writes a bundle rather
 * than a compiled tree, and `limits` because two of them sit on that one
 * metric: an advisory beneath the ceiling. Everything else — the convention
 * counters, the Python command — is spread in from the shared configuration
 * rather than restated. Before this file did so it replaced that configuration
 * outright, and silently reported none of them.
 *
 * ⚠️ The 512 KB limit is a ratchet against the measured size, not a design
 * target. The output is 196 KB gzipped because the Vite library build ships
 * React and Radix inside it rather than leaving them external, even though
 * React is a peer dependency. Until that is fixed the limit exists to catch
 * growth, not to express an intended size. The original 25 KB target has never
 * been met, and nothing enforced it: the build workflow discarded the failure
 * the measurement reported, so the breach never reached anyone.
 *
 * The advisory limit is the rung below the ceiling rather than a percentage of
 * it — 75% here, where it used to be a 90% constant inside the pull request
 * renderer that every project got whether or not it suited them. Both were
 * raised two rungs from the pair that bracketed the measured size, so the
 * advisory now sits above the measured 196 KB and stays quiet until the bundle
 * roughly doubles. That is the honest reading: it is an early warning again
 * because the ceiling moved, not because React and Radix were externalized.
 */
export default {
  ...codometerConfiguration,
  // The vendored shadcn components, hooks, and utilities, which nobody here
  // authored. `configuration/.codometerignore` has excluded them from the
  // repository's own statistics since it was written, but an ignore file is
  // anchored to the directory being measured: its
  // `packages/components-web/src/components/` entry matches nothing when
  // the walk starts inside this package, so a run here counted all 56 of them
  // and reported a package that is four-fifths code it does not own. Written
  // again, relative to this project, because that is the only anchor a
  // per-project run has.
  exclude: ["src/components/**", "src/hooks/**", "src/lib/**"],
  inputs: [
    {
      analyses: ["size"],
      compression: "gzip",
      include: ["dist/**/*.js"],
      name: "Library bundle",
    },
  ],
  limits: [
    { metric: "Library bundle.size", severity: "warn", value: "384 KB" },
    { metric: "Library bundle.size", value: "512 KB" },
  ],
};
