import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logger";

import { AspectEphemerisService } from "../aspects/aspect-ephemeris.service";
import {
  aspectBodies as minorAspectBodies,
  minorAspects,
} from "../caelundas/caelundas.constants";
import {
  capitalize,
  isBody,
  isMinorAspect,
} from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolByMinorAspect,
} from "../caelundas/symbol-caelundas.constants";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import type {
  AspectPhase,
  Body,
  MinorAspect,
} from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type {
  AssembleMinorAspectEventArguments,
  ExtractAspectComponentsResult,
} from "./minor-aspects.types";
import type { Moment } from "moment-timezone";

/** Event building and grouping helpers for {@link MinorAspectsService}. */
@Injectable()
export class MinorAspectsComposerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly aspectEphemerisService: AspectEphemerisService,
    private readonly logger: LoggerService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {
    this.logger.setContext(MinorAspectsComposerService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Assembles minor aspect event.
   */
  assembleMinorAspectEvent(args: AssembleMinorAspectEventArguments): Event {
    const { body1, body2, minorAspect, phase, timestamp } = args;
    const body1Capitalized = capitalize(body1);
    const body2Capitalized = capitalize(body2);
    const baseCategories = [
      "Astronomy",
      "Astrology",
      "Simple Aspect",
      "Minor Aspect",
      body1Capitalized,
      body2Capitalized,
      _.startCase(minorAspect),
    ];
    const { categories, description, phaseEmoji } = this.resolvePhaseDetails({
      baseCategories,
      body1Capitalized,
      body2Capitalized,
      minorAspect,
      phase,
    });
    const summary = `${phaseEmoji} ${symbolByBody[body1]} ${symbolByMinorAspect[minorAspect]} ${symbolByBody[body2]} ${description}`;
    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: timestamp.toISOString(),
      summary,
    });
    return {
      categories,
      description,
      end: timestamp,
      start: timestamp,
      summary,
    };
  }

  /**
   * Builds a stable grouping key from sorted bodies plus aspect name for pairing.
   */
  buildGroupKey(event: Event): string {
    const bodiesCapitalized = _.sortBy(
      event.categories.filter((category) =>
        minorAspectBodies
          .map((minorAspectBody) => _.startCase(minorAspectBody))
          .includes(category),
      ),
    );
    const aspectCapitalized = event.categories.find((category) =>
      minorAspects
        .map((minorAspect) => _.startCase(minorAspect))
        .includes(category),
    );
    if (bodiesCapitalized.length === 2 && aspectCapitalized) {
      return `${bodiesCapitalized[0]}-${aspectCapitalized}-${bodiesCapitalized[1]}`;
    }
    return "";
  }

  /**
   * Casts aspect components to types.
   */
  castAspectComponentsToTypes(args: {
    aspectCapitalized: string;
    body1Capitalized: string;
    body2Capitalized: string;
    categories: string[];
  }): { aspect: MinorAspect; body1: Body; body2: Body } {
    const {
      aspectCapitalized,
      body1Capitalized,
      body2Capitalized,
      categories,
    } = args;
    const aspectLower = aspectCapitalized.toLowerCase();
    const body1Lower = body1Capitalized.toLowerCase();
    const body2Lower = body2Capitalized.toLowerCase();
    if (
      !isMinorAspect(aspectLower) ||
      !isBody(body1Lower) ||
      !isBody(body2Lower)
    ) {
      throw new Error(
        `Could not extract typed values from categories: ${categories.join(", ")}`,
      );
    }
    return { aspect: aspectLower, body1: body1Lower, body2: body2Lower };
  }

  /**
   * Extracts aspect components.
   */
  extractAspectComponents(categories: string[]): ExtractAspectComponentsResult {
    const bodiesCapitalized = categories
      .filter((c: string) =>
        minorAspectBodies.map((b: string) => _.startCase(b)).includes(c),
      )
      .toSorted();
    const aspectCapitalized = categories.find((c: string) =>
      minorAspects.map((a: string) => _.startCase(a)).includes(c),
    );
    if (bodiesCapitalized.length !== 2 || !aspectCapitalized)
      throw new Error(
        `Could not extract aspect info: ${categories.join(", ")}`,
      );
    const body1Capitalized = bodiesCapitalized[0] ?? "";
    const body2Capitalized = bodiesCapitalized[1] ?? "";
    const { aspect, body1, body2 } = this.castAspectComponentsToTypes({
      aspectCapitalized,
      body1Capitalized,
      body2Capitalized,
      categories,
    });
    return {
      aspect,
      aspectCapitalized,
      body1,
      body1Capitalized,
      body2,
      body2Capitalized,
    };
  }

  /**
   * Returns previous/current/next longitudes for one body at minute resolution.
   */
  getLongitudesWindowForBody(args: {
    body: Body;
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
    nextMinute: Moment;
    previousMinute: Moment;
  }): { current: number; next: number; previous: number } {
    return this.aspectEphemerisService.getLongitudesWindowForBody(args);
  }

  /**
   * Creates one minor-aspect duration event from a matched forming/dissolving pair.
   */
  getMinorAspectProgressiveEvent(beginning: Event, ending: Event): Event {
    const {
      aspect,
      aspectCapitalized,
      body1,
      body1Capitalized,
      body2,
      body2Capitalized,
    } = this.extractAspectComponents(beginning.categories);

    const body1Symbol = symbolByBody[body1];
    const body2Symbol = symbolByBody[body2];
    const aspectSymbol = symbolByMinorAspect[aspect];

    return {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Minor Aspect",
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
   * Processes aspect group.
   */
  processAspectGroup(
    aspectGroupKey: string,
    aspectGroupEvents: Event[],
  ): Event[] {
    if (!aspectGroupKey) {
      return [];
    }
    const formingEvents = aspectGroupEvents.filter((event) =>
      event.categories.includes("Forming"),
    );
    const dissolvingEvents = aspectGroupEvents.filter((event) =>
      event.categories.includes("Dissolving"),
    );
    const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
      formingEvents,
      dissolvingEvents,
      `minor aspect ${aspectGroupKey}`,
    );
    return pairs.map(([beginning, ending]) =>
      this.getMinorAspectProgressiveEvent(beginning, ending),
    );
  }

  /**
   * Resolves phase details.
   */
  resolvePhaseDetails(args: {
    baseCategories: string[];
    body1Capitalized: string;
    body2Capitalized: string;
    minorAspect: MinorAspect;
    phase: AspectPhase;
  }): { categories: string[]; description: string; phaseEmoji: string } {
    const {
      baseCategories,
      body1Capitalized,
      body2Capitalized,
      minorAspect,
      phase,
    } = args;
    if (phase === "perfective") {
      return {
        categories: [...baseCategories, "Perfective"],
        description: `${body1Capitalized} perfective ${minorAspect} ${body2Capitalized}`,
        phaseEmoji: "🎯",
      };
    }
    if (phase === "forming") {
      return {
        categories: [...baseCategories, "Forming"],
        description: `${body1Capitalized} forming ${minorAspect} ${body2Capitalized}`,
        phaseEmoji: "➡️",
      };
    }
    return {
      categories: [...baseCategories, "Dissolving"],
      description: `${body1Capitalized} dissolving ${minorAspect} ${body2Capitalized}`,
      phaseEmoji: "⬅️",
    };
  }
}
