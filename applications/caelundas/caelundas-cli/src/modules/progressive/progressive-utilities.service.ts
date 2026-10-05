import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import type { Event } from "../calendar/calendar.types";

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
    beginnings: Event[],
    endings: Event[],
    label: string,
  ): [Event, Event][] {
    const pairCount = Math.min(beginnings.length, endings.length);

    if (beginnings.length !== endings.length) {
      this.logger.warn("🔀 Mismatched progressive event counts", undefined, {
        beginnings: beginnings.length,
        endings: endings.length,
        label,
      });
    }

    const pairs: [Event, Event][] = [];

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
