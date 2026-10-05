import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";
import { ProgressiveCompoundEventService } from "../aspects/progressive-compound-event.service";
import { aspectBodies as stelliumBodies } from "../caelundas/caelundas.constants";
import { isKeyOf } from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolByStellium,
} from "../caelundas/symbol-caelundas.constants";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Aspect, AspectPhase, Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { Moment } from "moment-timezone";

/**
 * Detects stellium configurations — concentrations of 4 or more bodies in close conjunction.
 *
 * Uses graph traversal over conjunction aspects to find clusters of bodies within
 * a small zodiacal arc, then computes forming/dissolving phases for each cluster.
 */
@Injectable()
export class StelliumService {
  // 🏗 Dependency Injection

  constructor(
    private readonly aspectGraphService: AspectGraphService,
    private readonly compoundPhaseService: CompoundPhaseService,
    private readonly progressiveCompoundEventService: ProgressiveCompoundEventService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Handles all pairs conjunct.
   */
  private allPairsConjunct(bodies: Body[], edges: AspectBodies[]): boolean {
    for (let index = 0; index < bodies.length; index++) {
      const bodyI = bodies[index];
      if (!bodyI) continue;
      for (let index_ = index + 1; index_ < bodies.length; index_++) {
        const bodyJ = bodies[index_];
        if (!bodyJ) continue;
        if (
          !this.haveAspect({
            aspectType: "conjunct",
            body1: bodyI,
            body2: bodyJ,
            edges,
          })
        )
          return false;
      }
    }
    return true;
  }

  /**
   * Handles bfs cluster.
   */
  private bfsCluster(
    startBody: Body,
    conjunctions: AspectBodies[],
    visited: Set<Body>,
  ): Set<Body> {
    const cluster = new Set<Body>();
    const queue: Body[] = [startBody];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || cluster.has(current)) continue;

      cluster.add(current);
      visited.add(current);

      for (const edge of conjunctions) {
        const neighbor = this.getNeighbor(edge, current);
        if (neighbor && !cluster.has(neighbor)) queue.push(neighbor);
      }
    }

    return cluster;
  }

  /**
   * Builds conjunction clusters.
   */
  private buildConjunctionClusters(conjunctions: AspectBodies[]): Set<Body>[] {
    const clusters: Set<Body>[] = [];
    const visited = new Set<Body>();
    const bodiesSet = new Set<Body>();

    for (const edge of conjunctions) {
      bodiesSet.add(edge.bodies[0]);
      bodiesSet.add(edge.bodies[1]);
    }

    for (const startBody of bodiesSet) {
      if (visited.has(startBody)) continue;
      const cluster = this.bfsCluster(startBody, conjunctions, visited);
      if (cluster.size >= 4) clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Builds progressive stellium event.
   */
  private buildProgressiveStelliumEvent(
    forming: Event,
    dissolving: Event,
  ): Event {
    return this.progressiveCompoundEventService.buildProgressiveCompoundEvent({
      descriptionCaseInsensitive: true,
      dissolving,
      forming,
    });
  }

  /**
   * Composes Stellium patterns from stored 2-body aspects.
   *
   * A Stellium is a concentration of 4 or more celestial bodies within
   * a small area of the zodiac (typically within 8° in the same sign).
   * All bodies must be in conjunction (0° ± orb) with each other.
   *
   * Uses graph traversal to identify clusters of conjunct bodies:
   * - Starts with each unvisited body
   * - Breadth-first search to find all transitively conjunct bodies
   * - Validates that all pairs in cluster are directly conjunct
   * - Only accepts clusters with 4+ bodies.
   *
   * Stelliums represent focused energy and emphasis in a particular
   * area of life or zodiac sign. The concentration of planetary energies
   * can indicate both talent and challenge in the associated domain.
   *
   * @see {@link determineCompoundPhaseFromSnapshots} for phase calculation
   * @see {@link haveAspect} for verifying conjunction relationships
   */
  private composeStelliums(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    const unionEdges = [...currentAspectBodies, ...previousAspectBodies];
    const conjunctions =
      this.groupAspectsByType(unionEdges).get("conjunct") ?? [];
    if (conjunctions.length < 6) return [];
    const events: Event[] = [];
    for (const cluster of this.buildConjunctionClusters(conjunctions)) {
      const bodies = [...cluster];
      if (!this.allPairsConjunct(bodies, unionEdges)) continue;
      const result =
        this.compoundPhaseService.determineCompoundPhaseFromSnapshots({
          checkPatternExists: (edges) => this.allPairsConjunct(bodies, edges),
          currentAspectBodies,
          currentMinute: minute,
          patternBodies: bodies,
          previousAspectBodies,
        });
      if (result)
        events.push(
          this.createStelliumEvent({
            bodies,
            phase: result.phase,
            timestamp: result.eventMinute,
          }),
        );
    }
    return events;
  }

  /**
   * Create a stellium event.
   */
  private createStelliumEvent(parameters: {
    bodies: Body[];
    phase: AspectPhase;
    timestamp: Moment;
  }): Event {
    const { bodies, phase, timestamp } = parameters;
    const bodiesCapitalized = bodies.map((b) => _.startCase(b));
    const bodySymbols = bodies.map((b) => symbolByBody[b]);
    const stelliumType = `${bodies.length}-body`;
    const stelliumSymbol = isKeyOf(symbolByStellium, stelliumType)
      ? symbolByStellium[stelliumType]
      : undefined;

    const description = `${_.sortBy([...bodiesCapitalized]).join(", ")} stellium ${phase}`;
    const phaseEmoji = this.phaseEmojiFor(phase);
    const summary = `${phaseEmoji}${stelliumSymbol} ${bodySymbols.join("-")} ${description}`;

    return {
      categories: [
        "Astronomy",
        "Astrology",
        "Compound Aspect",
        "Stellium",
        _.startCase(stelliumType),
        _.startCase(phase),
        ...bodiesCapitalized,
      ],
      description,
      end: timestamp,
      start: timestamp,
      summary,
    };
  }

  /**
   * Derives neighbor.
   */
  private getNeighbor(edge: AspectBodies, current: Body): Body | null {
    if (edge.bodies[0] === current) return edge.bodies[1];
    if (edge.bodies[1] === current) return edge.bodies[0];
    return null;
  }

  /**
   * Groups aspects by type.
   */
  private groupAspectsByType<T extends AspectBodies>(
    edges: T[],
  ): Map<Aspect, T[]> {
    return this.aspectGraphService.groupAspectsByType(edges);
  }

  /**
   * Handles have aspect.
   */
  private haveAspect(args: {
    aspectType: Aspect;
    body1: Body;
    body2: Body;
    edges: AspectBodies[];
  }): boolean {
    return this.aspectGraphService.haveAspect(args);
  }

  /**
   * Pairs stellium group.
   */
  private pairStelliumGroup(group: Event[]): Event[] {
    const result: Event[] = [];
    const sortedEvents = _.sortBy(group, "start");

    for (let index = 0; index < sortedEvents.length; index++) {
      const currentEvent = sortedEvents[index];
      if (!currentEvent?.categories.includes("Forming")) continue;

      for (let index_ = index + 1; index_ < sortedEvents.length; index_++) {
        const dissolving = sortedEvents[index_];
        if (dissolving?.categories.includes("Dissolving")) {
          result.push(
            this.buildProgressiveStelliumEvent(currentEvent, dissolving),
          );
          break;
        }
      }
    }

    return result;
  }

  /**
   * Handles phase emoji for.
   */
  private phaseEmojiFor(phase: AspectPhase): string {
    if (phase === "forming") return "➡️ ";
    if (phase === "perfective") return "🎯 ";
    return "⬅️ ";
  }

  /**
   * Handles stellium group key.
   */
  private stelliumGroupKey(event: Event): string {
    const planets = _.sortBy(
      event.categories.filter((category) =>
        stelliumBodies.map((b) => _.startCase(b)).includes(category),
      ),
    );
    const stelliumType = event.categories.find(
      (category) => category.includes("Body") && category !== "Stellium",
    );
    return `${planets.join("-")}_${stelliumType}`;
  }

  // 🌎 Public Methods

  /**
   * Detects all stellium patterns from stored 2-body aspect events.
   *
   * A stellium occurs when 4 or more bodies cluster together in conjunction,
   * typically within the same zodiac sign. This represents an area of
   * concentrated energy and focus in astrological interpretation.
   *
   * The function uses graph traversal to identify all conjunction clusters
   * and validates that each cluster forms a complete stellium (all pairs
   * must be in conjunction, not just transitively connected).
   *
   * @see {@link composeStelliums} for stellium detection logic
   */
  detect(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    return [
      ...this.composeStelliums({
        currentAspectBodies,
        minute,
        previousAspectBodies,
      }),
    ];
  }

  /**
   * Converts instantaneous stellium events into progressive events.
   *
   * Pairs forming and dissolving events for the same body group and
   * stellium size to create events spanning the entire active period.
   * Progressive events show when a stellium is in effect rather than just
   * boundary moments.
   *
   */
  detectProgressive(events: Event[]): Event[] {
    const stelliumEvents = events.filter((event) =>
      event.categories.includes("Stellium"),
    );

    const groupedEvents = _.groupBy(stelliumEvents, (event) =>
      this.stelliumGroupKey(event),
    );

    const progressiveEvents: Event[] = [];
    for (const group of Object.values(groupedEvents)) {
      progressiveEvents.push(...this.pairStelliumGroup(group));
    }

    return progressiveEvents;
  }
}
