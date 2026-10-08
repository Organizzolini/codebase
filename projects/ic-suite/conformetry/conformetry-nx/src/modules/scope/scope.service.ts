import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";

import { PROJECT_ROOT_PATTERN } from "./scope.constants";

import type { ProjectScope } from "../instances/instances.types";
import type { ConformetryInstanceGroup } from "@conformetry/configuration";

/**
 * Reads an instance group as Nx resolves it.
 *
 * A group carrying `tags` selects projects and reads its globs inside each
 * one; a group without them is a workspace glob, which is what a host with no
 * project graph writes. Telling the two apart by a field the group already has
 * is what keeps a generator's location stated once — nothing else can
 * contradict it, and so nothing can silently narrow it.
 *
 * Which of the two a group is, is the configuration layer's to say. The groups
 * this plugin claims and the ones `@conformetry/configuration` reads on its own
 * must be exact complements, and nothing fails if they are not — a group both
 * hosts skipped is simply never validated. One rule, read from one place, is
 * what rules that out.
 */
@Injectable()
export class ScopeService {
  // 🏗 Dependency Injection

  constructor(private readonly configurationService: ConfigurationService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether a group locates its instances by project tag. */
  private isProjectGroup(group: ConformetryInstanceGroup): boolean {
    return this.configurationService.isProjectScoped(group);
  }

  // 🌎 Public Methods

  /**
   * Returns whether a group applies to a project.
   *
   * A group with no tags applies everywhere — tags narrow a group, they do not
   * opt it in, so a configuration that never mentions them still reaches every
   * project. A project must carry every tag the group names, so a second tag
   * narrows the group further rather than widening it.
   */
  public matchesProject(args: {
    group: ConformetryInstanceGroup;
    project: ProjectScope;
  }): boolean {
    if (!this.isProjectGroup(args.group)) {
      return true;
    }

    return (args.group.tags ?? []).every((tag) => {
      return args.project.tags.includes(tag);
    });
  }

  /**
   * Resolves one group against a project, into workspace-relative globs.
   *
   * A tagged group's globs are read inside the project, so `src/modules/*`
   * means the same thing in every project it selects. An untagged group is
   * returned as written, which is how a host with no projects resolves it.
   * Either way the result is indistinguishable downstream from a hand-written
   * glob — discovery, validation, and layout inference need know nothing.
   */
  public resolveGroup(args: {
    group: ConformetryInstanceGroup;
    project: ProjectScope;
  }): ConformetryInstanceGroup[] {
    const patterns = args.group.patterns;

    if (
      !this.matchesProject(args) ||
      patterns === undefined ||
      patterns.length === 0
    ) {
      return [];
    }

    if (!this.isProjectGroup(args.group)) {
      return [args.group];
    }

    return [
      {
        ...args.group,
        patterns: patterns.map((pattern) => {
          return path.posix.join(args.project.root, pattern);
        }),
      },
    ];
  }

  /**
   * The folder a group's first glob points at, with any wildcard trimmed off.
   *
   * `src/modules/*` places a new module in `src/modules`; a glob that starts
   * with a wildcard places nothing, and layout falls back to being inferred.
   */
  public resolveScopedDirectory(
    groups: ConformetryInstanceGroup[],
  ): string | undefined {
    const group = groups.find((entry) => this.isProjectGroup(entry));
    const [pattern] = group?.patterns ?? [];

    if (pattern === undefined || pattern === PROJECT_ROOT_PATTERN) {
      return undefined;
    }

    const segments = pattern.split("/");
    const globIndex = segments.findIndex((segment) => segment.includes("*"));
    const staticSegments =
      globIndex === -1 ? segments : segments.slice(0, globIndex);

    return staticSegments.length === 0 ? undefined : staticSegments.join("/");
  }

  /**
   * The projects a generator's groups admit, by name and sorted.
   *
   * Sorted because the emitted schema is compared byte for byte by the drift
   * check, and an unstable order would report drift on every re-emit. A
   * generator with no tagged group admits nothing here, which the caller reads
   * as "do not constrain the prompt at all".
   */
  public resolveScopedProjectNames(args: {
    groups: ConformetryInstanceGroup[];
    projects: ProjectScope[];
  }): string[] {
    const taggedGroups = args.groups.filter((group) => {
      return this.isProjectGroup(group);
    });

    if (taggedGroups.length === 0) {
      return [];
    }

    return args.projects
      .filter((project) => {
        return taggedGroups.some((group) => {
          return this.matchesProject({ group, project });
        });
      })
      .map((project) => project.name)
      .toSorted((left, right) => left.localeCompare(right));
  }
}
