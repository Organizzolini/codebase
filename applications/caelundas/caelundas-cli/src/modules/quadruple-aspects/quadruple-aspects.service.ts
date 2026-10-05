import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { QuadrupleAspectsBaseService } from "./quadruple-aspects-base.service";
import { QuadrupleAspectsComposerService } from "./quadruple-aspects-composer.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { Moment } from "moment-timezone";

/**
 * Detects and pairs 4-body patterns (Grand Cross, Kite) from simple-aspect snapshots.
 */
@Injectable()
export class QuadrupleAspectsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly quadrupleAspectsBaseService: QuadrupleAspectsBaseService,
    private readonly quadrupleAspectsComposerService: QuadrupleAspectsComposerService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Detects all quadruple aspect patterns from stored 2-body aspect events.
   *
   * Analyzes combinations of simple aspects to identify 4-body patterns:
   * - Grand Cross (2 oppositions + 4 squares)
   * - Kite (Grand Trine + opposition + 2 sextiles).
   *
   * These rare configurations represent major life themes and turning points,
   * indicating either intense challenge (Grand Cross) or channeled talent (Kite).
   *
   * @see {@link parseAspectEvents} for extracting aspect relationships
   * @see {@link composeGrandCrosses} for Grand Cross detection
   * @see {@link composeKites} for Kite detection
   */
  detect(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    return [
      ...this.quadrupleAspectsComposerService.composeGrandCrosses({
        currentAspectBodies,
        minute,
        previousAspectBodies,
      }),
      ...this.quadrupleAspectsComposerService.composeKites({
        currentAspectBodies,
        minute,
        previousAspectBodies,
      }),
    ];
  }

  /**
   * Converts instantaneous quadruple aspect events into progressive events.
   *
   * Pairs forming and dissolving events for the same body quartet and
   * pattern type to create events spanning the entire active period.
   * Progressive events show when a pattern is in effect rather than just
   * boundary moments.
   *
   */
  detectProgressive(events: Event[]): Event[] {
    const progressiveEvents: Event[] = [];

    const quadrupleAspectEvents = events.filter((event) =>
      event.categories.includes("Quadruple Aspect"),
    );

    const groupedEvents = _.groupBy(quadrupleAspectEvents, (event) =>
      this.quadrupleAspectsBaseService.makeProgressiveGroupKey(event),
    );

    for (const group of Object.values(groupedEvents)) {
      this.quadrupleAspectsComposerService.collectProgressiveEventsFromGroup(
        group,
        progressiveEvents,
      );
    }

    return progressiveEvents;
  }

  /**
   * Returns the other body in an aspect edge relative to the given body.
   *
   */
  getOtherBody(edge: AspectBodies, body: Body): Body | null {
    return this.quadrupleAspectsBaseService.getOtherBody(edge, body);
  }

  /**
   * Returns `true` if the given aspect edge involves the specified celestial body.
   *
   */
  involvesBody(edge: AspectBodies, body: Body): boolean {
    return edge.bodies[0] === body || edge.bodies[1] === body;
  }
}
