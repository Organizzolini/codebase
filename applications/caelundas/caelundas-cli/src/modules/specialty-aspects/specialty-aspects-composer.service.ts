import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logger";

import {
  aspectBodies as specialtyAspectBodies,
  specialtyAspects,
} from "../caelundas/caelundas.constants";
import { isBody, isSpecialtyAspect } from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolBySpecialtyAspect,
} from "../caelundas/symbol-caelundas.constants";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import type {
  AspectPhase,
  Body,
  SpecialtyAspect,
  SpecialtyAspectSymbol,
} from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Event building and grouping helpers for {@link SpecialtyAspectsService}.
 */
@Injectable()
export class SpecialtyAspectsComposerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly ephemerisService: EphemerisService,
  ) {
    this.logger.setContext(SpecialtyAspectsComposerService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Builds and logs one specialty-aspect boundary event from pre-resolved display parts.
   */
  buildSpecialtyAspectEventFromParts(args: {
    body1Symbol: string;
    body2Symbol: string;
    categories: string[];
    description: string;
    phaseEmoji: string;
    specialtyAspectSymbol: SpecialtyAspectSymbol;
    timestamp: Moment;
  }): Event {
    const {
      body1Symbol,
      body2Symbol,
      categories,
      description,
      phaseEmoji,
      specialtyAspectSymbol,
      timestamp,
    } = args;
    const summary = `${phaseEmoji} ${body1Symbol} ${specialtyAspectSymbol} ${body2Symbol} ${description}`;
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
   * Extracts aspect bodies from categories.
   */
  extractAspectBodiesFromCategories(categories: string[]): {
    aspectCapitalized: string;
    body1Capitalized: string;
    body2Capitalized: string;
  } {
    const bodiesCapitalized = _.sortBy(
      categories.filter((category) =>
        specialtyAspectBodies.map((b) => _.startCase(b)).includes(category),
      ),
    );
    const aspectCapitalized = categories.find((category) =>
      specialtyAspects.map((a) => _.startCase(a)).includes(category),
    );
    if (bodiesCapitalized.length !== 2 || !aspectCapitalized) {
      throw new Error(
        `Could not extract aspect info from categories: ${categories.join(", ")}`,
      );
    }
    return {
      aspectCapitalized,
      body1Capitalized: bodiesCapitalized[0] ?? "",
      body2Capitalized: bodiesCapitalized[1] ?? "",
    };
  }

  /**
   * Extracts typed aspect values.
   */
  extractTypedAspectValues(args: {
    aspectCapitalized: string;
    body1Capitalized: string;
    body2Capitalized: string;
    categories: string[];
  }): { aspect: SpecialtyAspect; body1: Body; body2: Body } {
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
      !isSpecialtyAspect(aspectLower) ||
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
   * Returns previous/current/next longitudes for one body at minute resolution.
   */
  getBodyLongitudesWindow(args: {
    ephemeris: CoordinateEphemeris;
    minute: Moment;
    nextMinute: Moment;
    previousMinute: Moment;
  }): { current: number; next: number; previous: number } {
    const { ephemeris, minute, nextMinute, previousMinute } = args;
    return this.ephemerisService.getLongitudesWindow({
      ephemeris,
      minute,
      next: nextMinute,
      previous: previousMinute,
    });
  }

  /**
   * Creates one specialty-aspect duration event from a forming/dissolving pair.
   */
  getSpecialtyAspectProgressiveEvent(beginning: Event, ending: Event): Event {
    const { aspectCapitalized, body1Capitalized, body2Capitalized } =
      this.extractAspectBodiesFromCategories(beginning.categories);
    const { aspect, body1, body2 } = this.extractTypedAspectValues({
      aspectCapitalized,
      body1Capitalized,
      body2Capitalized,
      categories: beginning.categories,
    });
    const body1Symbol = symbolByBody[body1];
    const body2Symbol = symbolByBody[body2];
    const aspectSymbol = symbolBySpecialtyAspect[aspect];
    return {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Specialty Aspect",
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
   * Resolves categories, description, and emoji marker for the supplied phase.
   */
  phaseFields(args: {
    baseCategories: string[];
    body1Capitalized: string;
    body2Capitalized: string;
    phase: AspectPhase;
    specialtyAspect: SpecialtyAspect;
  }): { categories: string[]; description: string; phaseEmoji: string } {
    const {
      baseCategories,
      body1Capitalized,
      body2Capitalized,
      phase,
      specialtyAspect,
    } = args;
    if (phase === "perfective") {
      return {
        categories: [...baseCategories, "Perfective"],
        description: `${body1Capitalized} perfective ${specialtyAspect} ${body2Capitalized}`,
        phaseEmoji: "🎯",
      };
    }
    if (phase === "forming") {
      return {
        categories: [...baseCategories, "Forming"],
        description: `${body1Capitalized} forming ${specialtyAspect} ${body2Capitalized}`,
        phaseEmoji: "➡️",
      };
    }
    return {
      categories: [...baseCategories, "Dissolving"],
      description: `${body1Capitalized} dissolving ${specialtyAspect} ${body2Capitalized}`,
      phaseEmoji: "⬅️",
    };
  }

  /**
   * Builds a stable grouping key from sorted bodies plus specialty-aspect label.
   */
  specialtyAspectGroupKey(event: Event): string {
    const bodiesCapitalized = _.sortBy(
      event.categories.filter((category) =>
        specialtyAspectBodies.map((b) => _.startCase(b)).includes(category),
      ),
    );
    const aspectCapitalized = event.categories.find((category) =>
      specialtyAspects.map((a) => _.startCase(a)).includes(category),
    );
    return bodiesCapitalized.length === 2 && aspectCapitalized
      ? `${bodiesCapitalized[0]}-${aspectCapitalized}-${bodiesCapitalized[1]}`
      : "";
  }
}
