import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { CompoundPhaseService } from "../aspects/compound-phase.service";

import { QuadrupleAspectsBaseService } from "./quadruple-aspects-base.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { Moment } from "moment-timezone";

/**
 * Pattern detection and event building helpers for {@link QuadrupleAspectsService}.
 */
@Injectable()
export class QuadrupleAspectsComposerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly compoundPhaseService: CompoundPhaseService,
    private readonly quadrupleAspectsBaseService: QuadrupleAspectsBaseService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Collects grand crosses for opp1.
   */
  collectGrandCrossesForOpp1(args: {
    current: AspectBodies[];
    minute: Moment;
    opp1: AspectBodies;
    oppositions: AspectBodies[];
    previous: AspectBodies[];
    startIndex: number;
    unionEdges: AspectBodies[];
  }): Event[] {
    const {
      current,
      minute,
      opp1,
      oppositions,
      previous,
      startIndex,
      unionEdges,
    } = args;
    const events: Event[] = [];
    for (let index_ = startIndex; index_ < oppositions.length; index_++) {
      const opp2 = oppositions[index_];
      if (!opp2) continue;
      const event = this.tryBuildGrandCross({
        current,
        minute,
        opp1,
        opp2,
        previous,
        unionEdges,
      });
      if (event) events.push(event);
    }
    return events;
  }

  /**
   * Collects kite events for grand trine.
   */
  collectKiteEventsForGrandTrine(args: {
    current: AspectBodies[];
    gtBodies: Set<Body>;
    minute: Moment;
    oppositions: AspectBodies[];
    previous: AspectBodies[];
    unionEdges: AspectBodies[];
  }): Event[] {
    const { current, gtBodies, minute, oppositions, previous, unionEdges } =
      args;
    const events: Event[] = [];
    const gtList = [...gtBodies];

    for (const baseBody of gtList) {
      const otherTwo = gtList.filter((b) => b !== baseBody);
      for (const opp of oppositions) {
        const event = this.tryBuildKite({
          baseBody,
          current,
          gtBodies,
          minute,
          opp,
          otherTwo,
          previous,
          unionEdges,
        });
        if (event) events.push(event);
      }
    }

    return events;
  }

  /**
   * Collects progressive events from group.
   */
  collectProgressiveEventsFromGroup(
    group: Event[],
    progressiveEvents: Event[],
  ): void {
    const sortedEvents = _.sortBy(group, "start");

    for (let index = 0; index < sortedEvents.length; index++) {
      const currentEvent = sortedEvents[index];
      if (!currentEvent) continue;
      if (!currentEvent.categories.includes("Forming")) continue;

      for (let index_ = index + 1; index_ < sortedEvents.length; index_++) {
        const potentialDissolvingEvent = sortedEvents[index_];
        if (!potentialDissolvingEvent) continue;

        if (potentialDissolvingEvent.categories.includes("Dissolving")) {
          progressiveEvents.push(
            this.quadrupleAspectsBaseService.buildProgressiveEvent(
              currentEvent,
              potentialDissolvingEvent,
            ),
          );
          break;
        }
      }
    }
  }

  /**
   * Composes Grand Cross patterns from stored 2-body aspects.
   *
   * A Grand Cross is an intense configuration consisting of:
   * - 2 oppositions (180°) at right angles to each other
   * - 4 squares (90°) connecting adjacent bodies.
   *
   * Visual pattern:.
   * ```
   *     Body1
   *       |
   *       | square
   *       |
   * Body4 + Body2
   *       |
   *       | square
   *       |
   *     Body3
   * ```
   *
   * The four bodies form a cross with all cardinal/fixed/mutable signs.
   * Represents maximum tension and dynamic energy requiring integration
   * of four conflicting forces. Often indicates major life challenges
   * and potential for significant achievement.
   *
   * @see {@link determineMultiBodyPhase} for phase calculation
   */
  composeGrandCrosses(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    const events: Event[] = [];
    const unionEdges = [...currentAspectBodies, ...previousAspectBodies];
    const aspectsByType =
      this.quadrupleAspectsBaseService.groupAspectsByType(unionEdges);
    const oppositions = aspectsByType.get("opposite") || [];
    const squares = aspectsByType.get("square") || [];

    if (oppositions.length < 2 || squares.length < 4) return events;

    for (let index = 0; index < oppositions.length; index++) {
      const opp1 = oppositions[index];
      if (!opp1) continue;
      const found = this.collectGrandCrossesForOpp1({
        current: currentAspectBodies,
        minute,
        opp1,
        oppositions,
        previous: previousAspectBodies,
        startIndex: index + 1,
        unionEdges,
      });
      events.push(...found);
    }

    return events;
  }

  /**
   * Composes Kite patterns from stored 2-body aspects.
   *
   * A Kite is a mixed configuration consisting of:
   * - 1 Grand Trine (3 trines forming a triangle)
   * - 1 opposition from one trine body to a fourth focal body
   * - 2 sextiles from the focal body to the other two trine bodies.
   *
   * Visual pattern:.
   * ```
   *        Body1
   *        /   \
   *  trine/     \trine
   *      /       \
   *  Body2 ----- Body3
   *      \  trine /
   * sextile\   /sextile
   *         \ /
   *      FocalBody
   * ```
   *
   * The focal body provides direction and motivation to the harmonious
   * Grand Trine, creating a configuration that balances ease with drive.
   * Often indicates talent with opportunity for manifestation.
   *
   * @see {@link determineMultiBodyPhase} for phase calculation
   */
  composeKites(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    const events: Event[] = [];
    const unionEdges = [...currentAspectBodies, ...previousAspectBodies];
    const aspectsByType =
      this.quadrupleAspectsBaseService.groupAspectsByType(unionEdges);
    const trines = aspectsByType.get("trine") || [];
    const oppositions = aspectsByType.get("opposite") || [];
    const sextiles = aspectsByType.get("sextile") || [];

    if (trines.length < 3 || oppositions.length === 0 || sextiles.length < 2) {
      return events;
    }

    const grandTrines = this.quadrupleAspectsBaseService.findGrandTrines(
      trines,
      unionEdges,
    );
    for (const gtBodies of grandTrines) {
      const kiteEvents = this.collectKiteEventsForGrandTrine({
        current: currentAspectBodies,
        gtBodies,
        minute,
        oppositions,
        previous: previousAspectBodies,
        unionEdges,
      });
      events.push(...kiteEvents);
    }

    return events;
  }

  /**
   * Returns `true` if the given aspect edge involves the specified celestial body.
   *
   */
  involvesBody(edge: AspectBodies, body: Body): boolean {
    return edge.bodies[0] === body || edge.bodies[1] === body;
  }

  /**
   * Resolves grand cross event.
   */
  resolveGrandCrossEvent(args: {
    bodyList: Body[];
    current: AspectBodies[];
    minute: Moment;
    opp1: AspectBodies;
    opp2: AspectBodies;
    previous: AspectBodies[];
  }): Event | null {
    const { bodyList, current, minute, opp1, opp2, previous } = args;
    const result =
      this.compoundPhaseService.determineCompoundPhaseFromSnapshots({
        checkPatternExists: (edges) =>
          this.quadrupleAspectsBaseService.checkGrandCrossPattern({
            bodyList,
            edges,
            opp1,
            opp2,
          }),
        currentAspectBodies: current,
        currentMinute: minute,
        patternBodies: bodyList,
        previousAspectBodies: previous,
      });

    if (result && bodyList[0] && bodyList[1] && bodyList[2] && bodyList[3]) {
      return this.quadrupleAspectsBaseService.getQuadrupleAspectEvent({
        body1: bodyList[0],
        body2: bodyList[1],
        body3: bodyList[2],
        body4: bodyList[3],
        phase: result.phase,
        quadrupleAspect: "grand cross",
        timestamp: result.eventMinute,
      });
    }

    return null;
  }

  /**
   * Resolves kite event.
   */
  resolveKiteEvent(args: {
    baseBody: Body;
    bodies: Body[];
    current: AspectBodies[];
    fourthBody: Body;
    minute: Moment;
    other0: Body;
    other1: Body;
    previous: AspectBodies[];
  }): Event | null {
    const {
      baseBody,
      bodies,
      current,
      fourthBody,
      minute,
      other0,
      other1,
      previous,
    } = args;
    const result =
      this.compoundPhaseService.determineCompoundPhaseFromSnapshots({
        checkPatternExists: (edges) =>
          this.quadrupleAspectsBaseService.checkKitePattern({
            baseBody,
            edges,
            fourthBody,
            other0,
            other1,
          }),
        currentAspectBodies: current,
        currentMinute: minute,
        patternBodies: bodies,
        previousAspectBodies: previous,
      });

    if (result && bodies[0] && bodies[1] && bodies[2] && bodies[3]) {
      return this.quadrupleAspectsBaseService.getQuadrupleAspectEvent({
        body1: bodies[0],
        body2: bodies[1],
        body3: bodies[2],
        body4: bodies[3],
        focalOrApexBody: fourthBody,
        phase: result.phase,
        quadrupleAspect: "kite",
        timestamp: result.eventMinute,
      });
    }

    return null;
  }

  /**
   * Tries to build grand cross.
   */
  tryBuildGrandCross(args: {
    current: AspectBodies[];
    minute: Moment;
    opp1: AspectBodies;
    opp2: AspectBodies;
    previous: AspectBodies[];
    unionEdges: AspectBodies[];
  }): Event | null {
    const { current, minute, opp1, opp2, previous, unionEdges } = args;
    const bodies = new Set<Body>([
      opp1.bodies[0],
      opp1.bodies[1],
      opp2.bodies[0],
      opp2.bodies[1],
    ]);
    if (bodies.size !== 4) return null;

    const bodyList = [...bodies];
    const oppositeBodyMap =
      this.quadrupleAspectsBaseService.buildGrandCrossOppositeMap(opp1, opp2);

    if (
      !this.quadrupleAspectsBaseService.verifyGrandCrossSquares(
        bodyList,
        oppositeBodyMap,
        unionEdges,
      )
    ) {
      return null;
    }

    return this.resolveGrandCrossEvent({
      bodyList,
      current,
      minute,
      opp1,
      opp2,
      previous,
    });
  }

  // 🌎 Public Utilities

  /**
   * Tries to build kite.
   */
  tryBuildKite(args: {
    baseBody: Body;
    current: AspectBodies[];
    gtBodies: Set<Body>;
    minute: Moment;
    opp: AspectBodies;
    otherTwo: Body[];
    previous: AspectBodies[];
    unionEdges: AspectBodies[];
  }): Event | null {
    const {
      baseBody,
      current,
      gtBodies,
      minute,
      opp,
      otherTwo,
      previous,
      unionEdges,
    } = args;
    if (!this.involvesBody(opp, baseBody)) return null;

    const fourthBody = this.quadrupleAspectsBaseService.getOtherBody(
      opp,
      baseBody,
    );
    if (!fourthBody || gtBodies.has(fourthBody)) return null;

    const other0 = otherTwo[0];
    const other1 = otherTwo[1];
    if (!other0 || !other1) return null;

    const hasSextiles =
      this.quadrupleAspectsBaseService.haveAspect({
        aspectType: "sextile",
        body1: fourthBody,
        body2: other0,
        edges: unionEdges,
      }) &&
      this.quadrupleAspectsBaseService.haveAspect({
        aspectType: "sextile",
        body1: fourthBody,
        body2: other1,
        edges: unionEdges,
      });
    if (!hasSextiles) return null;

    return this.resolveKiteEvent({
      baseBody,
      bodies: [baseBody, other0, other1, fourthBody],
      current,
      fourthBody,
      minute,
      other0,
      other1,
      previous,
    });
  }
}
