// 🏷️ Types

import type { ProjectGraph } from "@nx/devkit";

/**
 * A project's immediate one-hop neighborhood in the Nx project graph.
 *
 * One hop in each direction is the whole point: what a project needs from the
 * workspace, and who would break if it changed, not the whole workspace graph
 * redrawn around it.
 */
export interface Neighborhood {
  /** Projects this one depends on, sorted. */
  readonly dependencies: string[];
  /** Projects that depend on this one, sorted. */
  readonly dependents: string[];
  /** Every edge to draw, sorted. */
  readonly edges: NeighborhoodEdge[];
  /** The project the neighborhood is centered on. */
  readonly projectName: string;
}

/** One project depending on another. */
export interface NeighborhoodEdge {
  /** True when Nx inferred the dependency from configuration, not from code. */
  readonly implicit: boolean;
  readonly source: string;
  readonly target: string;
}

/** A workspace project the Nx graph knows about. */
export interface NxProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  readonly name: string;
  /**
   * The project's own Nx tags, empty when it declares none.
   *
   * Carried here so that every tag gate downstream — `framework:nestjs`,
   * `language:python`, and the `nx` level's tag rules — reads a project
   * rather than reaching back into the Nx project graph for one field, which
   * is what made `@nx/devkit` a dependency of four packages that have no
   * other use for it.
   */
  readonly tags: string[];
}

/**
 * A workspace's Nx project graph, as everything outside this package holds it.
 *
 * A host reads one, carries it through a run, and hands it back to the
 * builders that need edges — without ever naming `@nx/devkit` or reading a
 * field off it. Every attribute another package actually wants is on
 * `NxProject` instead, so this stays a handle rather than a shape to inspect:
 * reach for a field here and the concern has leaked back out of the one
 * package that owns Nx.
 */
export type NxProjectGraph = ProjectGraph;
