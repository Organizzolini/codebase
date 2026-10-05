import { Injectable } from "@nestjs/common";

import {
  aspectBodies as specialtyAspectBodies,
  specialtyAspects,
} from "../caelundas/caelundas.constants";
import { isBody, isSpecialtyAspect } from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolBySpecialtyAspect,
} from "../caelundas/symbol-caelundas.constants";
import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import type { Body, SpecialtyAspect } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";

/**
 * Builds progressive specialty-aspect duration events by pairing forming and dissolving boundaries.
 */
@Injectable()
export class SpecialtyAspectsProgressiveService {
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
   * Builds progressive specialty-aspect events from detected minute-level events.
   */
  detectProgressive(events: Event[]): Event[] {
    return this.progressiveAspectService.buildSimpleAspectFamilyProgressiveEvents(
      {
        aspectCategory: "Specialty Aspect",
        categoryLabel: "specialty aspect",
        events,
        getAspectGroupKey: (event) => this.specialtyAspectGroupKey(event),
        getProgressiveEvent: (beginning, ending) =>
          this.getSpecialtyAspectProgressiveEvent(beginning, ending),
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
   * Backward-compatible wrapper retained for existing unit tests.
   */
  extractTypedAspectValues(args: {
    aspectCapitalized: string;
    body1Capitalized: string;
    body2Capitalized: string;
    categories: string[];
  }): { aspect: SpecialtyAspect; body1: Body; body2: Body } {
    const typedParts =
      this.progressiveAspectService.extractTypedAspectPartsOrThrow({
        aspects: specialtyAspects,
        bodies: specialtyAspectBodies,
        categories: args.categories,
        errorMessage: "Could not extract typed values from categories",
        isAspect: isSpecialtyAspect,
        isBody,
      });

    return {
      aspect: typedParts.aspect,
      body1: typedParts.body1,
      body2: typedParts.body2,
    };
  }

  /**
   * Creates one specialty-aspect duration event from a forming/dissolving pair.
   */
  getSpecialtyAspectProgressiveEvent(beginning: Event, ending: Event): Event {
    return this.progressiveAspectService.createSimpleAspectProgressiveEvent({
      aspectCategory: "Specialty Aspect",
      aspects: specialtyAspects,
      beginning,
      bodies: specialtyAspectBodies,
      ending,
      isAspect: isSpecialtyAspect,
      isBody,
      symbolByAspect: symbolBySpecialtyAspect,
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
        aspectCategory: "Specialty Aspect",
        categoryLabel: "specialty aspect",
        events: aspectGroupEvents,
        fixedAspectGroupKey: aspectGroupKey,
        getAspectGroupKey: () => "",
        getProgressiveEvent: (beginning, ending) =>
          this.getSpecialtyAspectProgressiveEvent(beginning, ending),
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
   * Builds a stable grouping key from sorted bodies plus specialty-aspect label.
   */
  specialtyAspectGroupKey(event: Event): string {
    return this.progressiveAspectService.buildAspectGroupKeyFromCategories({
      aspects: specialtyAspects,
      bodies: specialtyAspectBodies,
      categories: event.categories,
    });
  }
}
