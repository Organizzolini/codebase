// ♟️ Constants

import {
  CODOMETER_SEVERITIES,
  CODOMETER_STATISTIC_GROUPS,
  CODOMETER_SYMBOL_KINDS,
  CODOMETER_SYMBOL_MODIFIERS,
} from "@codometer/core";
import { z } from "zod";

import {
  CODOMETER_ANALYSES,
  CODOMETER_COMMENT_LANGUAGES,
  CODOMETER_COMPRESSIONS,
  CODOMETER_FORMATS,
  MISSING_FORMAT_MESSAGE,
  NEGATION_PREFIX,
} from "./configuration.constants";

import type { WriteMarkdownOutput } from "./output.types";

// 🧱 The schema, kept apart from the vocabulary it validates against.
//
// `configuration.constants.ts` holds the accepted words and the defaults; this
// file holds the zod schema built over them. Splitting it that way is what
// keeps the import one-directional — the schema reads the vocabulary and the
// vocabulary reads nothing — and a cycle between two files in this package
// would crash the Nest container rather than fail anything readable.

/**
 * Accepts a configured callback.
 *
 * Checked for being a function and nothing else: what it does with its
 * arguments is the author's business, and a schema cannot inspect it anyway.
 */
const callbackSchema = <CallbackType>(): z.ZodType<CallbackType> =>
  z.custom<CallbackType>((value) => typeof value === "function", {
    message: "Expected a function",
  });

/** A `comment` selector: which language and kind it narrows to, plus its budget. */
const commentSelectorSchema = z.object({
  kind: z.enum(CODOMETER_SYMBOL_KINDS).optional(),
  language: z.enum(CODOMETER_COMMENT_LANGUAGES).optional(),
  maximumCharacters: z.number().int().min(1).optional(),
  maximumLines: z.number().int().min(1).optional(),
  maximumWords: z.number().int().min(1).optional(),
  severity: z.enum(CODOMETER_SEVERITIES).optional(),
});

/**
 * One configured counter: `patterns`, `symbols`, `comment`, or any mix.
 *
 * Used for the top-level `custom` array, which is the only place a counter
 * is declared — an output's own `custom` selects labels from it rather than
 * declaring counters of its own.
 */
const customStatisticSchema = z
  .object({
    color: z.string().optional(),
    comment: commentSelectorSchema.optional(),
    group: z.enum(CODOMETER_STATISTIC_GROUPS).optional(),
    label: z.string(),
    patterns: z.array(z.string()).min(1).optional(),
    symbols: z
      .object({
        kinds: z.array(z.enum(CODOMETER_SYMBOL_KINDS)).min(1),
        modifiers: z.array(z.enum(CODOMETER_SYMBOL_MODIFIERS)).optional(),
      })
      .optional(),
  })
  // Without one of the three a counter has nothing to match on, and would
  // report a permanent zero rather than announcing it was misconfigured.
  .refine(
    (statistic) =>
      statistic.patterns !== undefined ||
      statistic.symbols !== undefined ||
      statistic.comment !== undefined,
    {
      message:
        "A statistic needs patterns to match files, symbols to match declarations, or a comment selector to match a budget — otherwise it counts nothing.",
    },
  );

/** One named set of files, declared by include and exclude globs. */
const inputSchema = z
  .object({
    analyses: z.array(z.enum(CODOMETER_ANALYSES)).min(1),
    compression: z.enum(CODOMETER_COMPRESSIONS).optional(),
    directory: z.string().min(1).optional(),
    // A `!` here would read as a negation and match nothing instead, since
    // every pattern in this list already removes files.
    exclude: z
      .array(
        z.string().refine((pattern) => !pattern.startsWith(NEGATION_PREFIX), {
          message:
            "An exclude glob already removes files, so a leading `!` has nothing to negate — write the glob without it.",
        }),
      )
      .optional(),
    include: z.array(z.string()).min(1),
    name: z.string().min(1),
  })
  // A list of nothing but negations reads as an input and resolves to no
  // include glob at all, so it would match nothing for good — and a limit
  // written against it could never breach.
  .superRefine((input, context) => {
    const addsFiles = input.include.some(
      (pattern) => !pattern.startsWith(NEGATION_PREFIX),
    );

    if (!addsFiles) {
      context.addIssue({
        code: "custom",
        message: `Input "${input.name}" has no include glob that adds files — every pattern in its include list starts with "${NEGATION_PREFIX}", so it would hold nothing to measure.`,
      });
    }
  });

/** The JSON output destination: a required path, and its own counter selection. */
const jsonOutputSchema = z.object({
  custom: z.array(z.string().min(1)).optional(),
  indentation: z.number().int().min(0).optional(),
  path: z.string(),
  type: z.literal("json"),
});

/** The markdown output destination: everything `write` needs, and its own counter selection. */
const markdownOutputSchema = z
  .object({
    custom: z.array(z.string().min(1)).optional(),
    description: z.string().optional(),
    endMarker: z.string().optional(),
    // Optional because a `write` function may name the file itself; a
    // markdown destination with neither is rejected below.
    path: z.string().optional(),
    startMarker: z.string().optional(),
    type: z.literal("markdown"),
    write: callbackSchema<WriteMarkdownOutput>().optional(),
  })
  .refine(
    (markdown) => markdown.path !== undefined || markdown.write !== undefined,
    {
      message:
        "Markdown output needs a path, a write function, or both — otherwise nothing names the file to write.",
    },
  );

/**
 * Validates a configuration file's contents.
 *
 * Zod strips unknown keys rather than rejecting them, so a configuration
 * written for a newer codometer still loads under an older one instead of
 * failing on a field it has no opinion about. That is also what makes a
 * removed field — `comments`, `documentation`, a per-language override —
 * silently absent from the resolved configuration rather than a validation
 * error.
 */
export const codometerConfigurationSchema = z
  .object({
    // A counter is addressed by its own label, so two sharing one would make
    // every `outputs[].custom` selection of either ambiguous.
    custom: z
      .array(customStatisticSchema)
      .refine(
        (statistics) =>
          new Set(statistics.map((statistic) => statistic.label)).size ===
          statistics.length,
        { message: "Every custom statistic needs its own label." },
      )
      .optional(),
    defaultInput: z.string().min(1).optional(),
    exclude: z.array(z.string()).optional(),
    excludeFrom: z.array(z.string()).optional(),
    format: z.enum(CODOMETER_FORMATS, { error: MISSING_FORMAT_MESSAGE }),
    inputs: z
      .array(inputSchema)
      // An input is addressed by its own name, so two sharing one would make
      // every limit on either of them ambiguous — and would leave it unclear
      // which one replaces the built-in `codebase` entry, if either does.
      .refine(
        (inputs) =>
          new Set(inputs.map((input) => input.name)).size === inputs.length,
        { message: "Every input needs its own name." },
      )
      .optional(),
    // Two limits may name one metric on purpose — a `warn` short of a `fail` is
    // how a repository sees a number coming before it stops a change — so
    // nothing here asks the paths to be distinct.
    limits: z
      .array(
        z.object({
          label: z.string().min(1).optional(),
          metric: z.string().min(1),
          severity: z.enum(CODOMETER_SEVERITIES).optional(),
          // Read rather than validated here: what a unit means is the
          // configuration service's to say, and saying it twice is how the two
          // answers drift apart.
          value: z.union([z.number(), z.string()]),
        }),
      )
      .optional(),
    // At most one destination per type: `--output-json [path]` and
    // `--output-markdown [path]` each name one path, so nothing on the command
    // line could ever address a second destination of a kind, and a run would
    // write one of the two while looking like it had obeyed.
    outputs: z
      .array(z.union([jsonOutputSchema, markdownOutputSchema]))
      .superRefine((outputs, context) => {
        const duplicated = outputs.find(
          (output, index) =>
            outputs.findIndex((other) => other.type === output.type) < index,
        );

        if (duplicated !== undefined) {
          context.addIssue({
            code: "custom",
            message: `A configuration may declare at most one output per type, and this one declares more than one "${duplicated.type}" output. Nothing on the command line could address the second, so write the one destination this repository means.`,
          });
        }
      })
      .optional(),
    python: z.object({ command: z.string().optional() }).optional(),
  })
  // An output's `custom` selects labels the top-level `custom` declared —
  // selection cannot conjure a counter that was never measured.
  .superRefine((configuration, context) => {
    const declaredLabels = new Set(
      (configuration.custom ?? []).map((statistic) => statistic.label),
    );

    for (const output of configuration.outputs ?? []) {
      for (const label of output.custom ?? []) {
        if (!declaredLabels.has(label)) {
          context.addIssue({
            code: "custom",
            message: `The "${output.type}" output selects the custom statistic "${label}", but no top-level "custom" entry declares that label. Declare it in "custom", or select a label that is.`,
          });
        }
      }
    }
  });
