// 🏷️ Types

import type { ConformetryInstanceGroup } from "../instance-group/instance-group.types";
import type { conformetryConfigurationSchema } from "./configuration.constants";
import type { z } from "zod";

/**
 * The loaded configuration: one entry per generator.
 *
 * An array rather than a keyed record because a generator's name is already a
 * field, and a record made the name true in two places at once.
 */
export type ConformetryConfiguration = ConformetryGeneratorDefinition[];

/** One generator, with the template it renders and the instances it governs. */
export interface ConformetryGeneratorDefinition {
  description?: string;
  /**
   * The values this generator substitutes, as JSON Schema fragments. Named for
   * what the implementation calls them everywhere else — a generator takes
   * inputs and renders a template with them.
   */
  inputs: Record<string, ConformetryGeneratorInputDefinition>;
  /**
   * Where this generator's output already lives in the workspace. Validation
   * expands these to find what to check; generation reads them to learn where
   * a new instance belongs.
   */
  instances: ConformetryInstanceGroup[];
  name: string;
  /** The template folder, relative to the workspace root. */
  templatePath: string;
  /**
   * Lowest conformance score, from 0 to 1, an instance of this template may
   * have and still pass.
   *
   * Left undefined when unset rather than defaulted to 1, so a run-level
   * `--threshold` still has somewhere to apply. The default is reached only
   * when no level supplies a value.
   */
  threshold?: number;
}

/** One configurable input, expressed as a JSON Schema fragment. */
export type ConformetryGeneratorInputDefinition = Record<string, unknown>;

/**
 * Minimal JSON Schema fragment used to discover a generator's inputs.
 *
 * Only the parts conformetry actually reads are modelled — `properties` for
 * the input names, and `required` for which ones must be supplied.
 */
export interface JsonSchemaDefinition {
  [key: string]: unknown;
  properties?: Record<string, unknown>;
}

/** One generator entry exactly as Zod parsed it, before defaults are applied. */
export type ParsedGeneratorEntry = z.infer<
  typeof conformetryConfigurationSchema
>[number];
