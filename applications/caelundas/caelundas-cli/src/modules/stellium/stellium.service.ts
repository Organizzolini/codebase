import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";
import { ProgressiveCompoundEventService } from "../aspects/progressive-compound-event.service";
import { aspectBodies as stelliumBodies } from "../caelundas/caelundas.constants";
import {
  symbolByBody,
  symbolByStellium,
} from "../caelundas/symbol-caelundas.constants";

import { stelliumNameBySize } from "./stellium.constants";

import type { AspectBodies } from "../aspects/aspects.types";
import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { Aspect, AspectPhase, Body } from "../caelundas/caelundas.types";
import type { Moment } from "moment-timezone";

/**
 * Detects stellium configurations — concentrations of 4 or more bodies in close conjunction.
 *
 * Finds the maximal cliques of the conjunction graph, so a stellium is
 * reported even when a body outside it is conjunct with only some of it, then
 * computes forming/dissolving phases for each clique.
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
   * Builds each body's set of conjunct neighbors.
   */
  private buildConjunctionNeighbors(
    conjunctions: AspectBodies[],
  ): Map<Body, Set<Body>> {
    const neighbors = new Map<Body, Set<Body>>();
    for (const { bodies } of conjunctions) {
      const [first, second] = bodies;
      neighbors.set(first, (neighbors.get(first) ?? new Set()).add(second));
      neighbors.set(second, (neighbors.get(second) ?? new Set()).add(first));
    }
    return neighbors;
  }

  /**
   * Builds progressive stellium event.
   */
  private buildProgressiveStelliumEvent(
    forming: DetectedCalendarEvent,
    dissolving: DetectedCalendarEvent,
  ): DetectedCalendarEvent {
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
   * Each stellium is a maximal clique of the conjunction graph with 4+
   * bodies: every pair is conjunct, and no other body is conjunct with all of
   * them. A larger connected component can hold several, overlapping ones.
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
  }): DetectedCalendarEvent[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    const unionEdges = this.aspectGraphService.unionAspectBodies(
      currentAspectBodies,
      previousAspectBodies,
    );
    const conjunctions =
      this.groupAspectsByType(unionEdges).get("conjunct") ?? [];
    if (conjunctions.length < 6) return [];
    const events: DetectedCalendarEvent[] = [];
    for (const bodies of this.findStelliumCliques(conjunctions)) {
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
  }): DetectedCalendarEvent {
    const { bodies, phase, timestamp } = parameters;
    const bodiesCapitalized = bodies.map((b) => _.startCase(b));
    const bodySymbols = bodies.map((b) => symbolByBody[b]);
    const stelliumType = `${bodies.length}-body`;
    const stelliumName = stelliumNameBySize[bodies.length];
    if (stelliumName === undefined) {
      throw new Error(`No stellium symbol for ${bodies.length} bodies`);
    }
    const stelliumSymbol = symbolByStellium[stelliumName];

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
   * Extends `clique` with every candidate in turn, skipping the pivot's
   * neighbors, and collects each clique that no excluded body could extend.
   */
  private extendCliques(args: {
    candidates: Set<Body>;
    clique: Body[];
    excluded: Set<Body>;
    found: Body[][];
    neighbors: Map<Body, Set<Body>>;
  }): void {
    const { candidates, clique, excluded, found, neighbors } = args;
    if (candidates.size === 0 && excluded.size === 0) {
      found.push(clique);
      return;
    }
    const neighborsOf = (body: Body): Set<Body> =>
      neighbors.get(body) ?? new Set();
    const pivot = _.maxBy(
      [...candidates, ...excluded],
      (body) => [...candidates].filter((c) => neighborsOf(body).has(c)).length,
    );
    const pivotNeighbors = pivot ? neighborsOf(pivot) : new Set<Body>();
    for (const body of [...candidates].filter((c) => !pivotNeighbors.has(c))) {
      const bodyNeighbors = neighborsOf(body);
      this.extendCliques({
        candidates: new Set(
          [...candidates].filter((c) => bodyNeighbors.has(c)),
        ),
        clique: [...clique, body],
        excluded: new Set([...excluded].filter((c) => bodyNeighbors.has(c))),
        found,
        neighbors,
      });
      candidates.delete(body);
      excluded.add(body);
    }
  }

  /**
   * Finds the maximal cliques of four or more bodies in the conjunction graph:
   * every pair of a clique is conjunct, and no other body is conjunct with
   * all of it.
   */
  private findStelliumCliques(conjunctions: AspectBodies[]): Body[][] {
    const neighbors = this.buildConjunctionNeighbors(conjunctions);
    const found: Body[][] = [];
    this.extendCliques({
      candidates: new Set(neighbors.keys()),
      clique: [],
      excluded: new Set(),
      found,
      neighbors,
    });
    return found
      .filter((clique) => clique.length >= 4)
      .map((clique) => this.aspectGraphService.canonicalBodyOrder(clique));
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
  private pairStelliumGroup(
    group: DetectedCalendarEvent[],
  ): DetectedCalendarEvent[] {
    const result: DetectedCalendarEvent[] = [];
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
  private stelliumGroupKey(event: DetectedCalendarEvent): string {
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
   * Each stellium is a maximal clique of conjunct bodies (all pairs in
   * conjunction, not just transitively connected), so no reported stellium
   * lies inside another.
   *
   * @see {@link composeStelliums} for stellium detection logic
   */
  detect(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): DetectedCalendarEvent[] {
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
  detectProgressive(events: DetectedCalendarEvent[]): DetectedCalendarEvent[] {
    const stelliumEvents = events.filter((event) =>
      event.categories.includes("Stellium"),
    );

    const groupedEvents = _.groupBy(stelliumEvents, (event) =>
      this.stelliumGroupKey(event),
    );

    const progressiveEvents: DetectedCalendarEvent[] = [];
    for (const group of Object.values(groupedEvents)) {
      progressiveEvents.push(...this.pairStelliumGroup(group));
    }

    return progressiveEvents;
  }
}
