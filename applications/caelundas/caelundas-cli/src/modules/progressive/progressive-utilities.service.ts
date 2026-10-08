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

  /**
   * Walks both lists in start order, pairing each beginning with the first
   * ending at or after it unless the next beginning comes first.
   */
  private pairInStartOrder(
    beginnings: DetectedCalendarEvent[],
    endings: DetectedCalendarEvent[],
  ): [DetectedCalendarEvent, DetectedCalendarEvent][] {
    const byStart = (
      first: DetectedCalendarEvent,
      second: DetectedCalendarEvent,
    ): number => first.start.valueOf() - second.start.valueOf();
    const orderedBeginnings = beginnings.toSorted(byStart);
    const orderedEndings = endings.toSorted(byStart);
    const pairs: [DetectedCalendarEvent, DetectedCalendarEvent][] = [];
    let endingIndex = 0;

    for (const [index, beginning] of orderedBeginnings.entries()) {
      while (
        orderedEndings[endingIndex]?.start.isBefore(beginning.start) === true
      ) {
        endingIndex++;
      }

      const ending = orderedEndings[endingIndex];
      const nextBeginning = orderedBeginnings[index + 1];
      if (
        ending !== undefined &&
        (nextBeginning === undefined || byStart(ending, nextBeginning) <= 0)
      ) {
        pairs.push([beginning, ending]);
        endingIndex++;
      }
    }

    return pairs;
  }

  // 🌎 Public Methods

  /**
   * Pairs each beginning with the earliest unused ending at or after it, as
   * long as that ending comes no later than the next beginning.
   *
   * Both lists are ordered by start time first, so an ending before the first
   * beginning (a window opening mid-occurrence) is dropped instead of shifting
   * every later span, and no span can end before it starts. A beginning whose
   * ending is missing is dropped rather than bridged to a later occurrence's
   * ending, and so is one with no ending in the window. Any unpaired event
   * logs a warning.
   */
  pairProgressiveEvents(
    beginnings: DetectedCalendarEvent[],
    endings: DetectedCalendarEvent[],
    label: string,
  ): [DetectedCalendarEvent, DetectedCalendarEvent][] {
    const pairs = this.pairInStartOrder(beginnings, endings);
    const unpairedBeginnings = beginnings.length - pairs.length;
    const unpairedEndings = endings.length - pairs.length;

    if (unpairedBeginnings > 0 || unpairedEndings > 0) {
      this.logger.warn("🔀 Unpaired progressive events", undefined, {
        label,
        paired: pairs.length,
        unpairedBeginnings,
        unpairedEndings,
      });
    }

    return pairs;
  }
}
