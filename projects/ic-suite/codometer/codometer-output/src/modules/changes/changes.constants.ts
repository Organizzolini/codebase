import { z } from "zod";

// ♟️ Constants

/**
 * Where a project's codometer run leaves its report.
 *
 * One glob per workspace directory rather than a single recursive sweep, so a
 * stray report inside `node_modules` or a build output directory cannot be
 * mistaken for a project's own measurement.
 */
export const REPORT_GLOBS = [
  "codometer-report.json",
  "applications/*/codometer-report.json",
  "packages/*/codometer-report.json",
  "packages/*/*/*/codometer-report.json",
  "projects/*/codometer-report.json",
  "projects/*/*/codometer-report.json",
  "projects/*/*/*/codometer-report.json",
  "tools/*/codometer-report.json",
];

/**
 * The shape of a codometer report, as far as this diff reads it.
 *
 * Validated rather than asserted: the file is output this package does not
 * produce, and a malformed one should read as "nothing measured" instead of
 * flowing through as untyped data.
 *
 * Nothing here is inferred from an absent field. A target says outright whether
 * its globs matched anything, and a metric nobody limited carries an empty
 * `limits` array rather than no limits key at all — so a target that matched
 * no files reads differently from one that genuinely measured zero, and an
 * unlimited metric differently from an unread report.
 *
 * `limits` is a list because a metric may carry more than one: the
 * configuration accepts a `warn` short of a `fail` on purpose, and the gate
 * enforces every one of them.
 *
 * `failures` is read for the same reason the rest of this is. A target the run
 * could not measure contributes no row, and a table that silently holds fewer
 * rows than the workspace has targets is a number that looks right only
 * because whatever would have contradicted it is missing.
 *
 * `unit` is carried through on every row rather than filtered here, so a
 * renderer can format a byte count differently from a plain count without this
 * package needing to know what a renderer does with either.
 */
export const codometerReportSchema = z.object({
  failures: z
    .array(
      z.object({
        kind: z.enum(["limit", "target"]),
        reason: z.string(),
        subject: z.string(),
      }),
    )
    .optional(),
  targets: z.array(
    z.object({
      empty: z.boolean(),
      metrics: z.array(
        z.object({
          limits: z.array(
            z.object({
              breached: z.boolean(),
              label: z.string().nullable(),
              severity: z.enum(["fail", "warn"]),
              value: z.number(),
            }),
          ),
          name: z.string(),
          unit: z.enum(["bytes"]).nullable(),
          value: z.number(),
        }),
      ),
      name: z.string(),
    }),
  ),
});
