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
   * Pairs beginning and ending events into tuples.
   */
  pairProgressiveEvents(
    beginnings: DetectedCalendarEvent[],
    endings: DetectedCalendarEvent[],
    label: string,
  ): [DetectedCalendarEvent, DetectedCalendarEvent][] {
    const pairCount = Math.min(beginnings.length, endings.length);

    if (beginnings.length !== endings.length) {
      this.logger.warn("🔀 Mismatched progressive event counts", undefined, {
        beginnings: beginnings.length,
        endings: endings.length,
        label,
      });
    }

    const pairs: [DetectedCalendarEvent, DetectedCalendarEvent][] = [];

    for (let index = 0; index < pairCount; index++) {
      const beginning = beginnings[index];
      const ending = endings[index];
      if (beginning !== undefined && ending !== undefined) {
        pairs.push([beginning, ending]);
      }
    }

    return pairs;
  }
}
