import { Injectable } from "@nestjs/common";

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

  // 🌎 Public Methods

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
}
