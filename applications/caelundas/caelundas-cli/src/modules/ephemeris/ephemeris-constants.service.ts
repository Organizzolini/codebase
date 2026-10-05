import { Injectable } from "@nestjs/common";

import { nodes } from "../caelundas/caelundas.constants";

import {
  swissEphemerisConstantByAsteroid,
  swissEphemerisConstantByPlanet,
} from "./ephemeris.constants";

import type { Body, Node } from "../caelundas/caelundas.types";

/**
 * Body and node constant lookups and classification predicates for Swiss Ephemeris.
 */
@Injectable()
export class EphemerisConstantsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly nodeSet: ReadonlySet<string> = new Set<string>(nodes);

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Looks up the Swiss Ephemeris constant for a non-node body (planet or asteroid).
   *
   * @throws When no constant is found for the body or if comets are requested.
   */
  public getSwissEphemerisConstantForBody(body: Exclude<Body, Node>): number {
    const planetConstant = (
      swissEphemerisConstantByPlanet as Partial<Record<string, number>>
    )[body];
    if (planetConstant !== undefined) {
      return planetConstant;
    }
    const asteroidConstant = (
      swissEphemerisConstantByAsteroid as Partial<Record<string, number>>
    )[body];
    if (asteroidConstant !== undefined) {
      return asteroidConstant;
    }
    throw new Error(
      `No Swiss Ephemeris constant for body "${body}". Comets are not supported.`,
    );
  }

  /**
   * Checks whether a body string represents a lunar node or other specialized node.
   */
  public isNode(body: string): body is Node {
    return this.nodeSet.has(body);
  }
}
