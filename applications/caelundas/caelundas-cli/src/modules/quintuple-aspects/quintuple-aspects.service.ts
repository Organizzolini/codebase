import { Injectable } from "@nestjs/common";

import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { QuintupleAspectsComposerService } from "./quintuple-aspects-composer.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { Moment } from "moment-timezone";

/**
 * Detects and pairs 5-body quintile patterns (pentagrams) from aspect snapshots.
 */
@Injectable()
export class QuintupleAspectsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly quintupleAspectsComposerService: QuintupleAspectsComposerService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Detects all quintuple aspect patterns from stored 2-body aspect events.
   *
   * Currently detects the Pentagram pattern (5 bodies in quintile relationships
   * forming a 5-pointed star). This is one of the rarest and most significant
   * configurations in astrology.
   */
  detect(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): DetectedCalendarEvent[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    return this.quintupleAspectsComposerService.composePentagrams({
      currentAspectBodies,
      minute,
      previousAspectBodies,
    });
  }

  /**
   * Converts instantaneous quintuple aspect events into progressive events.
   *
   * Pairs forming and dissolving events for the same body quintet and
   * pattern type to create events spanning the entire active period.
   *
   */
  detectProgressive(events: DetectedCalendarEvent[]): DetectedCalendarEvent[] {
    const progressiveEvents: DetectedCalendarEvent[] = [];
    const groupedEvents =
      this.quintupleAspectsComposerService.groupQuintupleEventsByKey(events);

    for (const [groupKey, group] of Object.entries(groupedEvents)) {
      const pairs = this.progressiveUtilitiesService.pairCompoundBoundaries(
        group,
        `Quintuple Aspect ${groupKey}`,
      );
      for (const [forming, dissolving] of pairs) {
        progressiveEvents.push(
          this.quintupleAspectsComposerService.buildProgressiveQuintupleEvent(
            forming,
            dissolving,
          ),
        );
      }
    }

    return progressiveEvents;
  }
}
