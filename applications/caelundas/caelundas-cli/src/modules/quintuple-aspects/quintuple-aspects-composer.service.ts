import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";
import { ProgressiveCompoundEventService } from "../aspects/progressive-compound-event.service";
import { aspectBodies as quintupleAspectBodies } from "../caelundas/caelundas.constants";
import { groupByToMap } from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolByQuintupleAspect,
} from "../caelundas/symbol-caelundas.constants";
import { MathService } from "../math/math.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type {
  Aspect,
  AspectPhase,
  Body,
  QuintupleAspect,
} from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type {
  BuildQuintupleEventParameters,
  ComposePentagramsArguments,
  GetQuintupleAspectEventArguments,
} from "./quintuple-aspects.types";
import type { Moment } from "moment-timezone";

/** Event building and pattern detection helpers for {@link QuintupleAspectsService}. */
@Injectable()
export class QuintupleAspectsComposerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly mathService: MathService,
    private readonly compoundPhaseService: CompoundPhaseService,
    private readonly aspectPhaseEmojiService: AspectPhaseEmojiService,
    private readonly progressiveCompoundEventService: ProgressiveCompoundEventService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Emits a pentagram boundary event when exactly five ordered bodies are available.
   */
  buildPentagramEvent(
    pentagramBodies: Body[],
    phase: AspectPhase,
    eventMinute: Moment,
  ): Event | null {
    const body1 = pentagramBodies[0];
    const body2 = pentagramBodies[1];
    const body3 = pentagramBodies[2];
    const body4 = pentagramBodies[3];
    const body5 = pentagramBodies[4];

    if (!body1 || !body2 || !body3 || !body4 || !body5) {
      return null;
    }

    return this.getQuintupleAspectEvent({
      body1,
      body2,
      body3,
      body4,
      body5,
      phase,
      quintupleAspect: "pentagram",
      timestamp: eventMinute,
    });
  }

  /**
   * Converts a forming/dissolving pentagram pair into one duration event.
   */
  buildProgressiveQuintupleEvent(forming: Event, dissolving: Event): Event {
    return this.progressiveCompoundEventService.buildProgressiveCompoundEvent({
      dissolving,
      forming,
    });
  }

  /**
   * Builds adjacency lists for quintile edges restricted to the candidate body subset.
   */
  buildQuintileConnections(
    bodies: Body[],
    edges: AspectBodies[],
  ): Map<Body, Set<Body>> {
    const connections = new Map<Body, Set<Body>>();

    for (const body of bodies) {
      connections.set(body, new Set());
    }

    for (const edge of edges) {
      if (
        edge.aspect === "quintile" &&
        bodies.includes(edge.bodies[0]) &&
        bodies.includes(edge.bodies[1])
      ) {
        connections.get(edge.bodies[0])?.add(edge.bodies[1]);
        connections.get(edge.bodies[1])?.add(edge.bodies[0]);
      }
    }

    return connections;
  }

  /**
   * Builds canonical categories used for grouping and downstream progressive pairing.
   */
  buildQuintupleAspectCategories(
    bodiesSorted: string[],
    quintupleAspect: QuintupleAspect,
    phase: AspectPhase,
  ): string[] {
    return [
      "Astronomy",
      "Astrology",
      "Compound Aspect",
      "Quintuple Aspect",
      _.startCase(quintupleAspect),
      _.startCase(phase),
      ...bodiesSorted,
    ];
  }

  /**
   * Formats summary as `phaseEmoji + aspectSymbol + symbolChain + description`.
   */
  buildQuintupleAspectSummary(args: {
    aspectSymbol: string;
    description: string;
    phase: AspectPhase;
    symbols: string[];
  }): string {
    const { aspectSymbol, description, phase, symbols } = args;
    const phaseEmoji = this.getPhaseEmoji(phase);
    const symbolChain = symbols.join("-");

    return `${phaseEmoji}${aspectSymbol} ${symbolChain} ${description}`;
  }

  /**
   * Materializes a finalized quintuple event from precomputed display fields.
   */
  buildQuintupleEventFromParameters(
    eventArguments: BuildQuintupleEventParameters,
  ): Event {
    const {
      aspectSymbol,
      bodiesSorted,
      phase,
      quintupleAspect,
      symbols,
      timestamp,
    } = eventArguments;

    const description = `${bodiesSorted.join(", ")} ${quintupleAspect} ${phase}`;
    const summary = this.buildQuintupleAspectSummary({
      aspectSymbol,
      description,
      phase,
      symbols,
    });
    const categories = this.buildQuintupleAspectCategories(
      bodiesSorted,
      quintupleAspect,
      phase,
    );

    return {
      categories,
      description,
      end: timestamp,
      start: timestamp,
      summary,
    };
  }

  /**
   * Collects quintile bodies.
   */
  collectQuintileBodies(quintiles: AspectBodies[]): Body[] {
    const bodiesSet = new Set<Body>();

    for (const edge of quintiles) {
      bodiesSet.add(edge.bodies[0]);
      bodiesSet.add(edge.bodies[1]);
    }

    return [...bodiesSet];
  }

  /**
   * Composes Pentagram patterns from stored 2-body aspects.
   *
   * A Pentagram is an extremely rare configuration of 5 bodies forming
   * a 5-pointed star with 5 quintile aspects (72° each).
   */
  composePentagrams(args: ComposePentagramsArguments): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    const unionEdges = [...currentAspectBodies, ...previousAspectBodies];
    const quintiles = this.groupAspectsByType(unionEdges).get("quintile") || [];
    if (quintiles.length < 5) return [];
    const bodies = this.collectQuintileBodies(quintiles);
    if (bodies.length < 5) return [];
    return this.processPentagramCombinations({
      combinations: this.mathService.getCombinations(bodies, 5),
      currentAspectBodies,
      minute,
      previousAspectBodies,
      unionEdges,
    });
  }

  /**
   * Count unique quintile pairs.
   */
  countUniqueQuintilePairs(
    edges: AspectBodies[],
    orderedBodies: Body[],
  ): number {
    const uniquePairs = new Set(
      edges
        .filter(
          (edge) =>
            edge.aspect === "quintile" &&
            orderedBodies.includes(edge.bodies[0]) &&
            orderedBodies.includes(edge.bodies[1]),
        )
        .map((edge) => {
          const sorted = [edge.bodies[0], edge.bodies[1]].toSorted();
          return `${sorted[0]}-${sorted[1]}`;
        }),
    );

    return uniquePairs.size;
  }

  /**
   * Checks if 5 bodies form a valid pentagram pattern (5-pointed star).
   *
   * A pentagram consists of 5 bodies where each body connects to exactly
   * 2 others via quintile aspects (72°), forming a 5-pointed star shape.
   */
  findPentagramPattern(bodies: Body[], edges: AspectBodies[]): Body[] | null {
    const connections = this.buildQuintileConnections(bodies, edges);

    for (const [, connected] of connections) {
      if (connected.size !== 2) {
        return null;
      }
    }

    const orderedBodies = this.traversePentagramPath(connections, bodies);

    if (!orderedBodies) {
      return null;
    }

    if (this.countUniqueQuintilePairs(edges, orderedBodies) !== 5) {
      return null;
    }

    return orderedBodies;
  }

  /**
   * Maps phase to the event-summary marker prefix.
   */
  getPhaseEmoji(phase: AspectPhase): string {
    return this.aspectPhaseEmojiService.getPhaseEmoji(phase);
  }

  /** Creates one quintuple-aspect boundary event for the provided five bodies. */
  getQuintupleAspectEvent(
    eventArguments: GetQuintupleAspectEventArguments,
  ): Event {
    const {
      body1,
      body2,
      body3,
      body4,
      body5,
      phase,
      quintupleAspect,
      timestamp,
    } = eventArguments;

    const bodiesList = [body1, body2, body3, body4, body5];
    const bodiesSorted = _.sortBy(bodiesList.map((b) => _.startCase(b)));
    const symbols = bodiesList.map((b) => symbolByBody[b]);
    const aspectSymbol = symbolByQuintupleAspect[quintupleAspect];

    return this.buildQuintupleEventFromParameters({
      aspectSymbol,
      bodies: bodiesList,
      bodiesSorted,
      phase,
      quintupleAspect,
      symbols,
      timestamp,
    });
  }

  /**
   * Groups aspects by type.
   */
  groupAspectsByType<T extends AspectBodies>(edges: T[]): Map<Aspect, T[]> {
    return groupByToMap(edges, (edge) => edge.aspect);
  }

  /**
   * Groups quintuple events by key.
   */
  groupQuintupleEventsByKey(events: Event[]): Record<string, Event[]> {
    const quintupleAspectEvents = events.filter((event) =>
      event.categories.includes("Quintuple Aspect"),
    );

    return _.groupBy(quintupleAspectEvents, (event) => {
      const filteredPlanets = event.categories.filter((category) =>
        quintupleAspectBodies.map((b) => _.startCase(b)).includes(category),
      );
      const planets = _.sortBy(filteredPlanets);
      const aspect = event.categories.find((c) => ["Pentagram"].includes(c));

      return `${planets.join("-")}_${aspect}`;
    });
  }

  /**
   * Processes pentagram combinations.
   */
  processPentagramCombinations(args: {
    combinations: Body[][];
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
    unionEdges: AspectBodies[];
  }): Event[] {
    const {
      combinations,
      currentAspectBodies,
      minute,
      previousAspectBodies,
      unionEdges,
    } = args;
    const events: Event[] = [];
    for (const bodyCombination of combinations) {
      const pentagramBodies = this.findPentagramPattern(
        bodyCombination,
        unionEdges,
      );
      if (!pentagramBodies) continue;
      const phaseTransition =
        this.compoundPhaseService.determineCompoundPhaseFromSnapshots({
          checkPatternExists: (edges) =>
            this.findPentagramPattern(pentagramBodies, edges) !== null,
          currentAspectBodies,
          currentMinute: minute,
          patternBodies: pentagramBodies,
          previousAspectBodies,
        });
      if (!phaseTransition) continue;
      const event = this.buildPentagramEvent(
        pentagramBodies,
        phaseTransition.phase,
        phaseTransition.eventMinute,
      );
      if (event) events.push(event);
    }
    return events;
  }

  /**
   * Traverses pentagram path.
   */
  traversePentagramPath(
    connections: Map<Body, Set<Body>>,
    bodies: Body[],
  ): Body[] | null {
    const start = bodies[0];
    if (!start) return null;
    const visited = new Set<Body>([start]);
    let currentBody = start;
    const orderedBodies: Body[] = [start];
    for (let index = 0; index < 4; index++) {
      const next = [...(connections.get(currentBody) || [])].find(
        (n) => !visited.has(n),
      );
      if (!next) return null;
      visited.add(next);
      orderedBodies.push(next);
      currentBody = next;
    }
    return connections.get(currentBody)?.has(start) ? orderedBodies : null;
  }
}
