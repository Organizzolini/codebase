// 🏷️ Types

import type {
  ConformetryGeneratorDefinition,
  ConformetryInstanceGroup,
} from "@conformetry/configuration";

/**
 * The conformetry configuration as this plugin reads it.
 *
 * Authors type their config as this rather than as `ConformetryConfiguration`
 * to have their instance groups checked against what Nx can actually resolve.
 */
export type ConformetryNxConfiguration = ConformetryNxGeneratorDefinition[];

/** One generator, whose instance groups this plugin resolves against Nx. */
export interface ConformetryNxGeneratorDefinition extends Omit<
  ConformetryGeneratorDefinition,
  "instances"
> {
  instances?: ConformetryNxInstanceGroup[] | undefined;
}

/**
 * One instance group, read as either a workspace glob or a project selector.
 *
 * The two forms are told apart by `tags`, so a generator says where it belongs
 * in exactly one place. There is no second field that could disagree with this
 * one, which is what the single key buys: a separate scope that excluded a
 * project the globs reached narrowed validation silently, and validation
 * cannot notice instances it was never offered.
 */
export type ConformetryNxInstanceGroup =
  | ConformetryNxProjectInstanceGroup
  | ConformetryNxWorkspaceInstanceGroup;

/** Instances located by project tag, with globs read inside each project. */
export interface ConformetryNxProjectInstanceGroup extends ConformetryInstanceGroup {
  /**
   * Globs relative to each matching project's root, or `.` for the project
   * itself.
   *
   * Omitted selects the projects without locating anything in them, which is
   * what a template with no instances yet wants: `nx g` is still confined to
   * the projects the template suits.
   */
  patterns?: string[] | undefined;
  /** Nx project tags a project must carry. A project must carry all of them. */
  tags: string[];
}

/** Instances located by workspace-relative globs, as any host resolves them. */
export interface ConformetryNxWorkspaceInstanceGroup extends ConformetryInstanceGroup {
  patterns: string[];
  /** Absent: this is the form a host with no project graph also uses. */
  tags?: undefined;
}
