import { Injectable } from "@nestjs/common";
import { createProjectGraphAsync } from "@nx/devkit";

import type {
  NxProject,
  ResolvedProjectDirectories,
  ResolvedProjectSelection,
} from "./projects.types";
import type { ProjectGraph } from "@nx/devkit";

/**
 * Resolves Nx project names to the directories a callidescope run traces.
 *
 * This is the whole of callidescope's Nx awareness. `callidescope-cli` and
 * `callidescope-graph` know nothing about Nx and never read a project graph;
 * they take directories. What an Nx workspace has that plain paths do not is
 * a stable name for each of those directories, and turning one into the other
 * is the only thing this package is for.
 *
 * The project graph is passed in rather than read here, so every resolution
 * rule below is testable without a workspace to build a graph from —
 * `readProjectGraph` is the one method that touches Nx at run time.
 */
@Injectable()
export class ProjectsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Every tag any project carries, sorted and deduplicated. */
  private readTags(projects: readonly NxProject[]): string[] {
    return [...new Set(projects.flatMap((project) => project.tags))].toSorted(
      (first, second) => first.localeCompare(second),
    );
  }

  /**
   * Collects the names of every project carrying any of the given tags, and
   * the tags nothing carries.
   *
   * Any of them rather than all of them. Nx tags come in families whose
   * members are mutually exclusive on one project — nothing is both
   * `type:application` and `type:package` — so requiring every tag would make
   * the common selection resolve to nothing. Any is also the reading that
   * composes: each tag widens the set, the way naming another project does.
   */
  private resolveTaggedNames(args: {
    projects: readonly NxProject[];
    tags: readonly string[];
  }): { names: string[]; unmatchedTags: string[] } {
    const names: string[] = [];
    const unmatchedTags: string[] = [];

    for (const tag of args.tags) {
      const tagged = args.projects.filter((project) =>
        project.tags.includes(tag),
      );

      if (tagged.length === 0) {
        unmatchedTags.push(tag);
        continue;
      }

      names.push(...tagged.map((project) => project.name));
    }

    return { names, unmatchedTags };
  }

  // 🌎 Public Methods

  /** Reads the workspace's Nx project graph. */
  public async readProjectGraph(): Promise<ProjectGraph> {
    return createProjectGraphAsync({ exitOnError: false });
  }

  /**
   * Lists every project the graph knows, sorted by name.
   *
   * A project rooted at the workspace root is kept rather than filtered out.
   * It resolves to `.`, which `--directories` accepts, and naming it is a
   * caller saying they mean the root program — a different thing from
   * omitting `--directories`, which walks the workspace for every
   * `tsconfig.json` there is.
   */
  public readProjects(graph: ProjectGraph): NxProject[] {
    return Object.entries(graph.nodes)
      .map(([name, node]) => ({
        name,
        root: node.data.root,
        tags: node.data.tags ?? [],
      }))
      .toSorted((first, second) => first.name.localeCompare(second.name));
  }

  /**
   * Widens a set of project names to include everything they depend on.
   *
   * Dependencies, never dependents. A call stack runs downward — a command
   * calls into the service it was injected with, which lives in a package it
   * depends on — and those packages are what a trace of one project has to
   * carry. Its dependents call *into* it and add no frames below it.
   *
   * This widens what the run is *scoped to*, not how far a stack runs:
   * `WorkspaceService.walkImportedProjectClosure` already builds the program
   * of every project the named directories transitively import. What the Nx
   * graph adds is edges the compiler never read — an implicit dependency, or
   * one that exists only at run time. Being scoped rather than merely reached
   * costs nothing in this plugin, which writes nothing anywhere; it is the
   * command-line host that acts on it, publishing a `README.md` section for a
   * scoped project on a `--write` run.
   *
   * External `npm:` targets are dropped: they have no workspace directory to
   * trace, and following them would mean tracing `node_modules`.
   */
  public resolveDependencyClosure(args: {
    graph: ProjectGraph;
    projectNames: readonly string[];
  }): string[] {
    const known = new Set(Object.keys(args.graph.nodes));
    const reached = new Set<string>();
    let pending = args.projectNames.filter((name) => known.has(name));

    // Walked a rank at a time rather than off a stack, so no step ever has to
    // ask whether it popped anything. A cycle terminates because a name
    // already reached is never queued again.
    while (pending.length > 0) {
      const next: string[] = [];

      for (const projectName of pending) {
        if (reached.has(projectName)) {
          continue;
        }

        reached.add(projectName);

        for (const dependency of args.graph.dependencies[projectName] ?? []) {
          if (known.has(dependency.target)) {
            next.push(dependency.target);
          }
        }
      }

      pending = next;
    }

    return [...reached].toSorted((first, second) =>
      first.localeCompare(second),
    );
  }

  /**
   * Resolves Nx project names and tags to their workspace-relative roots.
   *
   * The two selections are unioned, not intersected: naming a project and
   * naming a tag both widen what gets traced, and a project reached both ways
   * is still one directory. Intersecting them would make `--tags` a filter on
   * `--projects`, which would resolve to nothing whenever only one was given.
   *
   * Unknown names and unmatched tags are collected rather than dropped or
   * thrown on, so one resolution reports every typo at once instead of one
   * per run, and the caller decides whether a partial resolution is worth
   * tracing.
   */
  public resolveDirectories(args: {
    graph: ProjectGraph;
    projectNames?: readonly string[] | undefined;
    tags?: readonly string[] | undefined;
  }): ResolvedProjectDirectories {
    const selection = this.resolveProjectNames(args);

    return {
      ...selection,
      directories: this.toDirectories({
        graph: args.graph,
        projectNames: selection.projectNames,
      }),
    };
  }

  /**
   * Resolves names and tags to the project names they stand for.
   *
   * Separate from `resolveDirectories` because a directory is the last step,
   * not the only one: widening a selection along the Nx dependency graph
   * happens between the two, and it happens in names, which is the only
   * vocabulary the project graph speaks.
   */
  public resolveProjectNames(args: {
    graph: ProjectGraph;
    projectNames?: readonly string[] | undefined;
    tags?: readonly string[] | undefined;
  }): ResolvedProjectSelection {
    const projects = this.readProjects(args.graph);
    const known = new Set(projects.map((project) => project.name));
    const selected = new Set<string>();
    const unknownNames: string[] = [];

    for (const projectName of args.projectNames ?? []) {
      if (known.has(projectName)) {
        selected.add(projectName);
        continue;
      }

      unknownNames.push(projectName);
    }

    const tagged = this.resolveTaggedNames({ projects, tags: args.tags ?? [] });

    for (const projectName of tagged.names) {
      selected.add(projectName);
    }

    return {
      // Already sorted, since `readProjects` sorts by name.
      knownNames: projects.map((project) => project.name),
      knownTags: this.readTags(projects),
      projectNames: [...selected].toSorted((first, second) =>
        first.localeCompare(second),
      ),
      unknownNames,
      unmatchedTags: tagged.unmatchedTags,
    };
  }

  /** Maps project names to their workspace-relative roots, sorted and deduplicated. */
  public toDirectories(args: {
    graph: ProjectGraph;
    projectNames: readonly string[];
  }): string[] {
    const rootByName = new Map(
      this.readProjects(args.graph).map((project) => [
        project.name,
        project.root,
      ]),
    );
    const directories = new Set<string>();

    for (const projectName of args.projectNames) {
      const root = rootByName.get(projectName);

      if (root !== undefined) {
        directories.add(root);
      }
    }

    return [...directories].toSorted((first, second) =>
      first.localeCompare(second),
    );
  }
}
