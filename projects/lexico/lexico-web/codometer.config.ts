import { codometerConfiguration } from "../../../configuration/codometer.config.js";

// 🎯 Targets

/** What every target below measures, and how. */
const analyses = ["size"] as const;

/** Compression every measured size is reported after. */
const compression = "gzip";

/**
 * What this application is measured by.
 *
 * It overrides `inputs` because its build does not compile to one tree: the
 * four below partition it rather than overlapping, so the totals in the pull
 * request report add up. The entry chunk is what every visitor downloads, the
 * route chunks are what they download on navigation, and the server output
 * never reaches the browser at all but still shows cold-start cost. Measuring
 * only the entry chunk — as this configuration once did — reported 120 KB of a
 * 372 KB build. A single derived `**\/*.js` target would also miss the CSS
 * entirely.
 *
 * Everything else — the convention counters, the Python command — is spread in
 * from the shared configuration rather than restated. Before this file did so it
 * replaced that configuration outright, and silently reported none of them.
 *
 * Every limit is a rung on the ladder the workspace configuration describes,
 * and each one sits two rungs above the value that used to gate it. None of
 * them is a budget anybody designed: the entry chunk measures 124 KB against
 * 384, and the CSS measures 16 KB against 48. Read them as ceilings that catch
 * runaway growth rather than as sizes anyone is aiming at.
 */
export default {
  ...codometerConfiguration,
  inputs: [
    {
      analyses: [...analyses],
      compression,
      include: ["dist/client/assets/index-*.js"],
      name: "Client entry JavaScript",
    },
    {
      analyses: [...analyses],
      compression,
      include: ["dist/client/**/*.js", "!dist/client/assets/index-*.js"],
      name: "Client route JavaScript",
    },
    {
      analyses: [...analyses],
      compression,
      include: ["dist/client/**/*.css"],
      name: "Client CSS",
    },
    {
      analyses: [...analyses],
      compression,
      include: ["dist/server/**/*.js"],
      name: "Server JavaScript",
    },
  ],
  limits: [
    { metric: "Client entry JavaScript.size", value: "384 KB" },
    { metric: "Client route JavaScript.size", value: "192 KB" },
    { metric: "Client CSS.size", value: "48 KB" },
    { metric: "Server JavaScript.size", value: "384 KB" },
  ],
};
