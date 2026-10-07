// ♟️ Constants

import { z } from "zod";

import { assertNoCollisions } from "./configuration.utilities";

/** Raised when the configuration path points to an unsupported file type. */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}

/** Marks the workspace root during an upward search from the process cwd. */
export const WORKSPACE_MANIFEST_FILENAME = "pnpm-workspace.yaml";

/** Extensions the config loader can read. */
export const SUPPORTED_CONFIGURATION_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".json",
  ".jsonc",
  ".mjs",
  ".mts",
  ".ts",
]);

/** Any JSON value, used to accept arbitrary JSON Schema input fragments. */
const jsonSchemaDefinitionSchema: z.ZodType = z.lazy(() => {
  return z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchemaDefinitionSchema),
    z.record(z.string(), jsonSchemaDefinitionSchema),
  ]);
});

/**
 * Validates the generator list loaded from a config file.
 *
 * Every field a generator needs is declared here deliberately, and the
 * generator object is strict: an undeclared key is rejected rather than
 * stripped, so a workspace is told rather than left believing it configured
 * something. `tags` is carried uninterpreted for whichever host reads it.
 */
export const conformetryConfigurationSchema = z
  .array(
    z.strictObject({
      description: z.string().optional(),
      // Each input is a JSON Schema fragment, so it must be an object; its own
      // fields may hold any JSON value.
      inputs: z
        .record(z.string(), z.record(z.string(), jsonSchemaDefinitionSchema))
        .optional(),
      instances: z
        .array(
          z.object({
            exclude: z.array(z.string()).optional(),
            // Optional because a group naming only `tags` is meaningful to a
            // host that resolves them: it names where a generator may be run
            // without claiming anything there is an instance yet.
            patterns: z.array(z.string()).optional(),
            substitutions: z.record(z.string(), z.string()).optional(),
            tags: z.array(z.string()).optional(),
            threshold: z.number().min(0).max(1).optional(),
          }),
        )
        .optional(),
      name: z.string(),
      templatePath: z.string(),
      threshold: z.number().min(0).max(1).optional(),
    }),
  )
  .superRefine(assertNoCollisions);
