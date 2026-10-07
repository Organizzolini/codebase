// 🏷️ Types

import type { ConformetryConfiguration } from "../configuration/configuration.types.js";
import type { Substitutions } from "../rendering/rendering.types";
import type { TemplateDefinition } from "../template-discovery/template-discovery.types.js";
import type { PreparedValidationDocument } from "@conformetry/core";

/** Arguments for expanding instance globs into instances. */
export interface FindInstancesArguments {
  /**
   * Globs, relative to the working directory, naming paths that are never
   * instances: a directory or file a pattern found is dropped when one of
   * these matches it.
   */
  readonly exclude?: string[] | undefined;
  /** Glob patterns, resolved against the working directory. */
  readonly patterns: string[];
  /**
   * Applied to every instance these patterns produce. Callers that need
   * per-project values, such as an Nx plugin supplying `type`, call once per
   * project rather than passing a lookup table.
   */
  readonly substitutions?: Substitutions;
  /** Applied to every instance these patterns produce, when the group sets one. */
  readonly threshold?: number;
  readonly workingDirectory: string;
}

/**
 * A place a template's tree is rendered into, plus the name it renders with.
 *
 * Instances come from the caller's glob expansion. Nothing here knows how they
 * were found — that is the host's job, because globbing a workspace and
 * reading project labels is workspace knowledge, not template knowledge.
 */
export interface Instance {
  /**
   * Absolute paths the match is restricted to, or `undefined` for the whole
   * directory tree.
   *
   * This is what lets a two-file template like `nestjs-service-file` win. A
   * directory glob leaves the scope open and the largest fitting template
   * wins; a file glob narrows the scope to the matched files, so a template
   * describing exactly those files fits better than one describing the whole
   * directory.
   */
  readonly fileScope?: string[];
  /** Drives the name substitutions — a directory basename or a filename stem. */
  readonly nameStem: string;
  /**
   * Absolute path to the directory the template's tree is laid over.
   *
   * A template that produces a folder contains that folder, so this is the
   * folder's *parent*: `nestjs-service-module` holds `{{nameKebabCase}}/…`,
   * and its path is `…/src/modules`. A template that produces loose files
   * holds them at its root, and its path is the directory those files sit in.
   */
  readonly path: string;
  /**
   * Substitutions the caller supplies on top of the derived name variants,
   * such as `type` from the project graph. Mustache renders an unknown
   * placeholder as empty, so anything a template references must arrive here.
   */
  readonly substitutions?: Substitutions;
  /**
   * Lowest conformance score this instance may have, from the instance group
   * that located it. The narrowest of the three levels, so it wins.
   */
  readonly threshold?: number;
}

/** A file a matched template requires its instance to have. */
export interface InstanceFile {
  readonly instance: MatchedInstance;
  readonly instanceFilePath: string;
  readonly templateFilePath: string;
}

/** An instance paired with the template that best explains it. */
export interface MatchedInstance {
  readonly instance: Instance;
  /** How many of the template's files the instance already has. */
  readonly matchedFileCount: number;
  /**
   * The random stand-in rendered for each placeholder nothing supplied, keyed
   * by placeholder. Validation replaces each with the text the instance holds
   * there. Absent or empty when every placeholder was supplied.
   */
  readonly placeholderValues?: Substitutions;
  /** Every value the template renders with, stand-ins included. */
  readonly substitutions: Substitutions;
  readonly template: TemplateDefinition;
}

/** Documents prepared for one matched instance. */
export interface PreparedInstanceDocuments {
  readonly documents: PreparedValidationDocument[];
  readonly instance: MatchedInstance;
}

/** Arguments for preparing comparison documents for matched instances. */
export interface PrepareDocumentsArguments {
  readonly fileExtensions: string[];
  readonly instances: MatchedInstance[];
}

/** The outcome of resolving a set of instances against a set of templates. */
export interface ResolvedInstances {
  readonly matched: MatchedInstance[];
  readonly unmatched: UnmatchedInstance[];
}

/**
 * Arguments for taking an inventory of templates and instances.
 *
 * Both filters narrow the pairing rather than the search, so an entry that
 * survives neither drops out entirely.
 */
export interface ResolveInventoryArguments {
  readonly configuration: ConformetryConfiguration;
  /** Globs narrowing which instances count; the configured ones when absent. */
  readonly instancePatterns?: string[] | undefined;
  /** Template names narrowing which templates count; all of them when absent. */
  readonly templateNames?: string[] | undefined;
  readonly workingDirectory: string;
}

/**
 * One template weighed against an instance during matching.
 *
 * `matchRatio` measures which template *fits*, by file presence alone. It is
 * deliberately not called a score: an instance's conformance score measures
 * how well the matched template's contents are honoured, which is a different
 * number arrived at a different way.
 */
export interface TemplateMatch {
  readonly matchedFileCount: number;
  /** Share of the template's files the instance already has, 0 to 1. */
  readonly matchRatio: number;
  /** The stand-ins this template needed — see `MatchedInstance`. */
  readonly placeholderValues: Substitutions;
  /** The instance's substitutions with those stand-ins added. */
  readonly substitutions: Substitutions;
  readonly template: TemplateDefinition;
}

/** An instance no template explains well enough to validate against. */
export interface UnmatchedInstance {
  readonly instance: Instance;
  readonly reason: UnmatchedReason;
  /** Templates that tied, when the reason is `ambiguous`. */
  readonly tiedTemplateNames: string[];
}

/**
 * Why an instance could not be matched.
 *
 * Both are reported rather than skipped: a glob is the caller asserting these
 * directories are instances, so an instance matching nothing is a real finding,
 * and a tie means two templates are indistinguishable.
 */
export type UnmatchedReason = "ambiguous" | "no-match";
