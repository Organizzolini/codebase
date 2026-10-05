import { Injectable } from "@nestjs/common";

import {
  aspectBodies as minorAspectBodies,
  minorAspects,
} from "../caelundas/caelundas.constants";
import { isBody, isMinorAspect } from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolByMinorAspect,
} from "../caelundas/symbol-caelundas.constants";
import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import type { Body, MinorAspect } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";

/**
 * Builds progressive minor-aspect duration events by pairing forming and dissolving boundaries.
 */
@Injectable()
export class MinorAspectsProgressiveService {
  // 🏗 Dependency Injection

  constructor(
    private readonly progressiveAspectService: ProgressiveAspectService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Builds a stable grouping key from sorted bodies plus aspect name for pairing.
   */
  buildGroupKey(event: Event): string {
    return this.progressiveAspectService.buildAspectGroupKeyFromCategories({
      aspects: minorAspects,
      bodies: minorAspectBodies,
      categories: event.categories,
    });
  }

  /**
   * Backward-compatible wrapper retained for existing unit tests.
   */
  castAspectComponentsToTypes(args: {
    aspectCapitalized: string;
    body1Capitalized: string;
    body2Capitalized: string;
    categories: string[];
  }): { aspect: MinorAspect; body1: Body; body2: Body } {
    const typedParts =
      this.progressiveAspectService.extractTypedAspectPartsOrThrow({
        aspects: minorAspects,
        bodies: minorAspectBodies,
        categories: args.categories,
        errorMessage: "Could not extract typed values from categories",
        isAspect: isMinorAspect,
        isBody,
      });

    return {
      aspect: typedParts.aspect,
      body1: typedParts.body1,
      body2: typedParts.body2,
    };
  }

  /**
   * Builds progressive minor-aspect events from detected minute-level events.
   */
  detectProgressive(events: Event[]): Event[] {
    return this.progressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(
      {
        aspectCategory: "Minor Aspect",
        categoryLabel: "minor aspect",
        events,
        getAspectGroupKey: (event) => this.buildGroupKey(event),
        getProgressiveEvent: (beginning, ending) =>
          this.getMinorAspectProgressiveEvent(beginning, ending),
        pairProgressiveEvents: (beginnings, endings, label) =>
          this.progressiveUtilitiesService.pairProgressiveEvents(
            beginnings,
            endings,
            label,
          ),
      },
    );
  }

  /**
   * Creates one minor-aspect duration event from a matched forming/dissolving pair.
   */
  getMinorAspectProgressiveEvent(beginning: Event, ending: Event): Event {
    return this.progressiveAspectService.createSimpleAspectProgressiveEvent({
      aspectCategory: "Minor Aspect",
      aspects: minorAspects,
      beginning,
      bodies: minorAspectBodies,
      ending,
      isAspect: isMinorAspect,
      isBody,
      symbolByAspect: symbolByMinorAspect,
      symbolByBody,
    });
  }

  /**
   * Pairs forming and dissolving events for one grouped body-pair/aspect key.
   */
  processAspectGroup(
    aspectGroupKey: string,
    aspectGroupEvents: Event[],
  ): Event[] {
    return this.progressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(
      {
        aspectCategory: "Minor Aspect",
        categoryLabel: "minor aspect",
        events: aspectGroupEvents,
        fixedAspectGroupKey: aspectGroupKey,
        getAspectGroupKey: () => "",
        getProgressiveEvent: (beginning, ending) =>
          this.getMinorAspectProgressiveEvent(beginning, ending),
        pairProgressiveEvents: (beginnings, endings, label) =>
          this.progressiveUtilitiesService.pairProgressiveEvents(
            beginnings,
            endings,
            label,
          ),
      },
    );
  }
}
