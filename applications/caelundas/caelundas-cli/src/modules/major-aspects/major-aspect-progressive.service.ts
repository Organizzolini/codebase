import { Injectable } from "@nestjs/common";

import {
  aspectBodies as majorAspectBodies,
  majorAspects,
} from "../caelundas/caelundas.constants";
import { isBody, isMajorAspect } from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolByMajorAspect,
} from "../caelundas/symbol-caelundas.constants";
import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import type { Body, MajorAspect } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";

/**
 * Builds progressive major-aspect duration events by pairing forming and dissolving boundaries.
 */
@Injectable()
export class MajorAspectProgressiveService {
  // 🏗 Dependency Injection

  constructor(
    private readonly progressiveAspectService: ProgressiveAspectService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds a stable grouping key from sorted bodies plus major-aspect label.
   */
  private getAspectGroupKey(event: Event): string {
    return this.progressiveAspectService.buildAspectGroupKeyFromCategories({
      aspects: majorAspects,
      bodies: majorAspectBodies,
      categories: event.categories,
    });
  }

  /**
   * Builds one progressive duration event from a forming/dissolving pair.
   */
  private getMajorAspectProgressiveEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return this.progressiveAspectService.createSimpleAspectProgressiveEvent({
      aspectCategory: "Major Aspect",
      aspects: majorAspects,
      beginning,
      bodies: majorAspectBodies,
      ending,
      isAspect: isMajorAspect,
      isBody,
      symbolByAspect: symbolByMajorAspect,
      symbolByBody,
    });
  }

  // 🌎 Public Methods

  /**
   * Backward-compatible wrapper retained for existing unit tests.
   */
  castAspectPartsToTypes(args: {
    aspectCapitalized: string;
    body1Capitalized: string;
    body2Capitalized: string;
    categories: string[];
  }): { aspect: MajorAspect; body1: Body; body2: Body } {
    const typedParts =
      this.progressiveAspectService.extractTypedAspectPartsOrThrow({
        aspects: majorAspects,
        bodies: majorAspectBodies,
        categories: args.categories,
        errorMessage: "Could not extract typed values from categories",
        isAspect: isMajorAspect,
        isBody,
      });

    return {
      aspect: typedParts.aspect,
      body1: typedParts.body1,
      body2: typedParts.body2,
    };
  }

  /**
   * Builds progressive major-aspect events from detected minute-level events.
   */
  detectProgressive(events: Event[]): Event[] {
    return this.progressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(
      {
        aspectCategory: "Major Aspect",
        categoryLabel: "major aspect",
        events,
        getAspectGroupKey: (event) => this.getAspectGroupKey(event),
        getProgressiveEvent: (beginning, ending) =>
          this.getMajorAspectProgressiveEvent(beginning, ending),
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
   * Pairs forming and dissolving events for one grouped body-pair/aspect key.
   */
  processAspectGroup(
    aspectGroupKey: string,
    aspectGroupEvents: Event[],
  ): Event[] {
    return this.progressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(
      {
        aspectCategory: "Major Aspect",
        categoryLabel: "major aspect",
        events: aspectGroupEvents,
        fixedAspectGroupKey: aspectGroupKey,
        getAspectGroupKey: () => "",
        getProgressiveEvent: (beginning, ending) =>
          this.getMajorAspectProgressiveEvent(beginning, ending),
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
