import { Injectable } from "@nestjs/common";

import { bodies } from "../caelundas/caelundas.constants";
import { groupByToMap } from "../caelundas/caelundas.types";

import type { Aspect, Body } from "../caelundas/caelundas.types";
import type { AspectBodies } from "./aspects.types";

/**
 * Shared helpers for aspect-edge graph queries used by compound-aspect services.
 */
@Injectable()
export class AspectGraphService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Order-insensitive identity of one edge: its aspect and its two bodies. */
  private edgeKey(edge: AspectBodies): string {
    return [edge.aspect, ...edge.bodies.toSorted()].join("\u001F");
  }

  // 🌎 Public Methods

  /**
   * Returns the bodies in the order `bodies` declares them, so a pattern found
   * from edges in any order is titled the same way.
   */
  canonicalBodyOrder(patternBodies: readonly Body[]): Body[] {
    return patternBodies.toSorted(
      (first, second) => bodies.indexOf(first) - bodies.indexOf(second),
    );
  }

  /**
   * Returns neighbors of `body` connected by the requested aspect type.
   */
  findBodiesWithAspectTo(
    body: Body,
    aspectType: Aspect,
    edges: AspectBodies[],
  ): Body[] {
    return edges
      .filter(
        (edge) =>
          edge.aspect === aspectType &&
          (edge.bodies[0] === body || edge.bodies[1] === body),
      )
      .map((edge) =>
        edge.bodies[0] === body ? edge.bodies[1] : edge.bodies[0],
      );
  }

  /**
   * Groups aspect edges by aspect type.
   */
  groupAspectsByType<T extends AspectBodies>(edges: T[]): Map<Aspect, T[]> {
    return groupByToMap(edges, (edge) => edge.aspect);
  }

  /**
   * Returns `true` when an undirected body pair has the requested aspect in the edge set.
   */
  haveAspect(args: {
    aspectType: Aspect;
    body1: Body;
    body2: Body;
    edges: AspectBodies[];
  }): boolean {
    const { aspectType, body1, body2, edges } = args;
    return edges.some(
      (edge) =>
        edge.aspect === aspectType &&
        ((edge.bodies[0] === body1 && edge.bodies[1] === body2) ||
          (edge.bodies[0] === body2 && edge.bodies[1] === body1)),
    );
  }

  /**
   * Merges the current and previous registries into one edge set holding each
   * edge once, however its bodies are ordered. An edge in both snapshots would
   * otherwise make every pattern through it compose twice.
   */
  unionAspectBodies(
    currentAspectBodies: AspectBodies[],
    previousAspectBodies: AspectBodies[],
  ): AspectBodies[] {
    const edgesByKey = new Map<string, AspectBodies>();
    for (const edge of [...currentAspectBodies, ...previousAspectBodies]) {
      const key = this.edgeKey(edge);
      if (!edgesByKey.has(key)) {
        edgesByKey.set(key, edge);
      }
    }
    return [...edgesByKey.values()];
  }
}
