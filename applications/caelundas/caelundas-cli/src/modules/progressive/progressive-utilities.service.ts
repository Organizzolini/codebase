import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";

/**
 * Utility service for pairing progressive events.
 *
 * Wraps the `pairProgressiveEvents` algorithm as an injectable provider so
 * all consumers can receive it through NestJS dependency injection instead of
 * importing the standalone utility function directly.
 */
@Injectable()
export class ProgressiveUtilitiesService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ProgressiveUtilitiesService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Pairs each beginning with the earliest unused ending at or after it.
   *
   * Both lists are ordered by start time first, so an ending that comes before
   * the first beginning (a window opening mid-occurrence) is dropped instead of
   * shifting every later span, and no span can end before it starts. A
   * beginning with no ending after it (a window closing mid-occurrence) is
   * dropped too, and any unpaired event logs a warning.
   */
  pairProgressiveEvents(
    beginnings: DetectedCalendarEvent[],
    endings: DetectedCalendarEvent[],
    label: string,
  ): [DetectedCalendarEvent, DetectedCalendarEvent][] {
    const byStart = (
      first: DetectedCalendarEvent,
      second: DetectedCalendarEvent,
    ): number => first.start.valueOf() - second.start.valueOf();
    const orderedEndings = endings.toSorted(byStart);

    const pairs: [DetectedCalendarEvent, DetectedCalendarEvent][] = [];
    let endingIndex = 0;

    for (const beginning of beginnings.toSorted(byStart)) {
      let ending = orderedEndings[endingIndex];
      while (ending !== undefined && byStart(ending, beginning) < 0) {
        endingIndex++;
        ending = orderedEndings[endingIndex];
      }

      if (ending === undefined) {
        break;
      }

      pairs.push([beginning, ending]);
      endingIndex++;
    }

    if (pairs.length !== beginnings.length || pairs.length !== endings.length) {
      this.logger.warn("🔀 Mismatched progressive event counts", undefined, {
        beginnings: beginnings.length,
        endings: endings.length,
        label,
      });
    }

    return pairs;
  }
}
