import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logging";

import { bodyDisplayName } from "../caelundas/caelundas.types";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { TypedAspectParts } from "./progressive.types";

/**
 * Shared helper service for building progressive aspect events.
 */
@Injectable()
export class ProgressiveAspectService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ProgressiveAspectService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Create a stable group key from sorted body labels and aspect label.
   */
  buildAspectGroupKeyFromCategories({
    aspects,
    bodies,
    categories,
  }: {
    aspects: readonly string[];
    bodies: readonly string[];
    categories: string[];
  }): string {
    const bodyLabels = new Set(bodies.map((body) => bodyDisplayName(body)));
    const aspectLabels = new Set(aspects.map((aspect) => _.startCase(aspect)));

    const bodiesCapitalized = _.sortBy(
      categories.filter((category) => bodyLabels.has(category)),
    );
    const aspectCapitalized = categories.find((category) =>
      aspectLabels.has(category),
    );

    if (bodiesCapitalized.length === 2 && aspectCapitalized !== undefined) {
      return `${bodiesCapitalized[0]}-${aspectCapitalized}-${bodiesCapitalized[1]}`;
    }

    return "";
  }

  /**
   * Build progressive duration events for an aspect category by pairing Forming/Dissolving boundaries.
   */
  buildProgressiveAspectEvents({
    aspectCategory,
    categoryLabel,
    events,
    getAspectGroupKey,
    getProgressiveEvent,
    pairProgressiveEvents,
  }: {
    aspectCategory: string;
    categoryLabel: string;
    events: DetectedCalendarEvent[];
    getAspectGroupKey: (event: DetectedCalendarEvent) => string;
    getProgressiveEvent: (
      beginning: DetectedCalendarEvent,
      ending: DetectedCalendarEvent,
    ) => DetectedCalendarEvent;
    pairProgressiveEvents: (
      beginnings: DetectedCalendarEvent[],
      endings: DetectedCalendarEvent[],
      label: string,
    ) => [DetectedCalendarEvent, DetectedCalendarEvent][];
  }): DetectedCalendarEvent[] {
    const aspectEvents = events.filter((event) =>
      event.categories.includes(aspectCategory),
    );

    const groupedAspectEvents = _.groupBy(aspectEvents, (event) =>
      getAspectGroupKey(event),
    );

    const progressiveEvents: DetectedCalendarEvent[] = [];
    for (const [aspectGroupKey, aspectGroupEvents] of Object.entries(
      groupedAspectEvents,
    )) {
      if (!aspectGroupKey) {
        continue;
      }

      const formingEvents = aspectGroupEvents.filter((event) =>
        event.categories.includes("Forming"),
      );
      const dissolvingEvents = aspectGroupEvents.filter((event) =>
        event.categories.includes("Dissolving"),
      );

      const pairs = pairProgressiveEvents(
        formingEvents,
        dissolvingEvents,
        `${categoryLabel} ${aspectGroupKey}`,
      );

      progressiveEvents.push(
        ...pairs.map(([beginning, ending]) =>
          getProgressiveEvent(beginning, ending),
        ),
      );
    }

    return progressiveEvents;
  }

  /**
   * Builds progressive events for one simple-aspect family, optionally constrained to one precomputed group key.
   */
  buildSimpleAspectFamilyProgressiveEvents({
    aspectCategory,
    categoryLabel,
    events,
    fixedAspectGroupKey,
    getAspectGroupKey,
    getProgressiveEvent,
    pairProgressiveEvents,
  }: {
    aspectCategory: string;
    categoryLabel: string;
    events: DetectedCalendarEvent[];
    fixedAspectGroupKey?: string;
    getAspectGroupKey: (event: DetectedCalendarEvent) => string;
    getProgressiveEvent: (
      beginning: DetectedCalendarEvent,
      ending: DetectedCalendarEvent,
    ) => DetectedCalendarEvent;
    pairProgressiveEvents: (
      beginnings: DetectedCalendarEvent[],
      endings: DetectedCalendarEvent[],
      label: string,
    ) => [DetectedCalendarEvent, DetectedCalendarEvent][];
  }): DetectedCalendarEvent[] {
    return this.buildProgressiveAspectEvents({
      aspectCategory,
      categoryLabel,
      events,
      getAspectGroupKey:
        fixedAspectGroupKey === undefined
          ? getAspectGroupKey
          : () => fixedAspectGroupKey,
      getProgressiveEvent,
      pairProgressiveEvents,
    });
  }

  /**
   * Create a single progressive event for a simple aspect (major, minor, or specialty).
   */
  createSimpleAspectProgressiveEvent<
    TAspect extends string,
    TBody extends string,
  >({
    aspectCategory,
    aspects,
    beginning,
    bodies,
    ending,
    isAspect,
    isBody,
    symbolByAspect,
    symbolByBody,
  }: {
    aspectCategory: string;
    aspects: readonly TAspect[];
    beginning: DetectedCalendarEvent;
    bodies: readonly TBody[];
    ending: DetectedCalendarEvent;
    isAspect: (value: string) => value is TAspect;
    isBody: (value: string) => value is TBody;
    symbolByAspect: Readonly<Record<TAspect, string>>;
    symbolByBody: Readonly<Record<TBody, string>>;
  }): DetectedCalendarEvent {
    const {
      aspect,
      aspectCapitalized,
      body1,
      body1Capitalized,
      body2,
      body2Capitalized,
    } = this.extractTypedAspectParts<TAspect, TBody>({
      aspects,
      bodies,
      categories: beginning.categories,
      isAspect,
      isBody,
    });

    const body1Symbol = symbolByBody[body1];
    const body2Symbol = symbolByBody[body2];
    const aspectSymbol = symbolByAspect[aspect];

    return {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        aspectCategory,
        body1Capitalized,
        body2Capitalized,
        aspectCapitalized,
      ],
      description: `${body1Capitalized} ${aspect} ${body2Capitalized}`,
      end: ending.start,
      start: beginning.start,
      summary: `${body1Symbol}${aspectSymbol}${body2Symbol} ${body1Capitalized} ${aspect} ${body2Capitalized}`,
    };
  }

  /**
   * Extract typed body/aspect values from event categories using aspect/body registries.
   */
  extractTypedAspectParts<TAspect extends string, TBody extends string>({
    aspects,
    bodies,
    categories,
    isAspect,
    isBody,
  }: {
    aspects: readonly TAspect[];
    bodies: readonly TBody[];
    categories: string[];
    isAspect: (value: string) => value is TAspect;
    isBody: (value: string) => value is TBody;
  }): TypedAspectParts<TAspect, TBody> {
    const bodyLabels = new Set(bodies.map((body) => bodyDisplayName(body)));
    const aspectLabels = new Set(aspects.map((aspect) => _.startCase(aspect)));

    const bodiesCapitalized = _.sortBy(
      categories.filter((category) => bodyLabels.has(category)),
    );
    const aspectCapitalized = categories.find((category) =>
      aspectLabels.has(category),
    );

    if (bodiesCapitalized.length !== 2 || aspectCapitalized === undefined) {
      throw new Error(
        `Could not extract aspect info from categories: ${categories.join(", ")}`,
      );
    }

    const body1Capitalized = bodiesCapitalized[0] ?? "";
    const body2Capitalized = bodiesCapitalized[1] ?? "";
    const aspectLower = aspectCapitalized.toLowerCase();
    const body1Lower = body1Capitalized.toLowerCase();
    const body2Lower = body2Capitalized.toLowerCase();

    if (!isAspect(aspectLower) || !isBody(body1Lower) || !isBody(body2Lower)) {
      throw new Error(
        `Could not extract typed values from categories: ${categories.join(", ")}`,
      );
    }

    return {
      aspect: aspectLower,
      aspectCapitalized,
      body1: body1Lower,
      body1Capitalized,
      body2: body2Lower,
      body2Capitalized,
    };
  }

  /**
   * Typed extraction wrapper with a normalized error message for compatibility call sites.
   */
  extractTypedAspectPartsOrThrow<TAspect extends string, TBody extends string>({
    aspects,
    bodies,
    categories,
    errorMessage,
    isAspect,
    isBody,
  }: {
    aspects: readonly TAspect[];
    bodies: readonly TBody[];
    categories: string[];
    errorMessage: string;
    isAspect: (value: string) => value is TAspect;
    isBody: (value: string) => value is TBody;
  }): TypedAspectParts<TAspect, TBody> {
    try {
      return this.extractTypedAspectParts({
        aspects,
        bodies,
        categories,
        isAspect,
        isBody,
      });
    } catch (originalError) {
      this.logger.error("📐 Failed extracting typed aspect parts", undefined, {
        categories,
        reason:
          originalError instanceof Error
            ? originalError.message
            : String(originalError),
      });
      throw new Error(errorMessage, { cause: originalError });
    }
  }
}
