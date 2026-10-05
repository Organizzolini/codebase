import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { QuintupleAspectsComposerService } from "./quintuple-aspects-composer.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Event } from "../calendar/calendar.types";
import type { Moment } from "moment-timezone";

/**
 * Detects and pairs 5-body quintile patterns (pentagrams) from aspect snapshots.
 */
@Injectable()
export class QuintupleAspectsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly quintupleAspectsComposerService: QuintupleAspectsComposerService,
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
  }): Event[] {
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
  detectProgressive(events: Event[]): Event[] {
    const progressiveEvents: Event[] = [];
    const groupedEvents =
      this.quintupleAspectsComposerService.groupQuintupleEventsByKey(events);

    for (const group of Object.values(groupedEvents)) {
      const sortedEvents = _.sortBy(group, "start");

      for (let index = 0; index < sortedEvents.length; index++) {
        const currentEvent = sortedEvents[index];

        if (!currentEvent?.categories.includes("Forming")) {
          continue;
        }

        for (
          let secondIndex = index + 1;
          secondIndex < sortedEvents.length;
          secondIndex++
        ) {
          const potentialDissolvingEvent = sortedEvents[secondIndex];

          if (!potentialDissolvingEvent) {
            continue;
          }

          if (potentialDissolvingEvent.categories.includes("Dissolving")) {
            progressiveEvents.push(
              this.quintupleAspectsComposerService.buildProgressiveQuintupleEvent(
                currentEvent,
                potentialDissolvingEvent,
              ),
            );
            break;
          }
        }
      }
    }

    return progressiveEvents;
  }
}
