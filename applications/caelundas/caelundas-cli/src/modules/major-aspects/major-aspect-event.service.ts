import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logger";

import { AspectsUtilitiesService } from "../aspects/aspects-utilities.service";
import { majorAspects } from "../caelundas/caelundas.constants";
import { capitalize } from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolByMajorAspect,
} from "../caelundas/symbol-caelundas.constants";

import type {
  AspectPhase,
  Body,
  MajorAspect,
} from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { Moment } from "moment-timezone";

/**
 * Builds and formats major-aspect events.
 */
@Injectable()
export class MajorAspectEventService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly aspectsUtilitiesService: AspectsUtilitiesService,
  ) {
    this.logger.setContext(MajorAspectEventService.name);
  }

  // 🔐 Private Fields

  private readonly phaseMetadata = {
    dissolving: { emoji: "⬅️", label: "Dissolving", verb: "dissolving" },
    forming: { emoji: "➡️", label: "Forming", verb: "forming" },
    perfective: { emoji: "🎯", label: "Perfective", verb: "perfective" },
  } as const satisfies Record<
    AspectPhase,
    { emoji: string; label: string; verb: string }
  >;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Assembles one major-aspect event payload.
   */
  private assembleMajorAspectEvent(args: {
    body1: Body;
    body2: Body;
    majorAspect: MajorAspect;
    phase: AspectPhase;
    timestamp: Moment;
  }): Event {
    const { categories, description, summary } = this.buildAspectEventParts({
      body1: args.body1,
      body2: args.body2,
      majorAspect: args.majorAspect,
      phase: args.phase,
    });
    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: args.timestamp.toISOString(),
      summary,
    });

    return {
      categories,
      description,
      end: args.timestamp,
      start: args.timestamp,
      summary,
    };
  }

  /**
   * Builds event categories, description, and summary for one aspect event.
   */
  private buildAspectEventParts(args: {
    body1: Body;
    body2: Body;
    majorAspect: MajorAspect;
    phase: AspectPhase;
  }): { categories: string[]; description: string; summary: string } {
    const { body1, body2, majorAspect, phase } = args;

    const body1Capitalized = capitalize(body1);
    const body2Capitalized = capitalize(body2);
    const body1Symbol = symbolByBody[body1];
    const body2Symbol = symbolByBody[body2];
    const majorAspectSymbol = symbolByMajorAspect[majorAspect];
    const { emoji: phaseEmoji, label, verb } = this.phaseMetadata[phase];
    const description = `${body1Capitalized} ${verb} ${majorAspect} ${body2Capitalized}`;

    return {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Major Aspect",
        body1Capitalized,
        body2Capitalized,
        _.startCase(majorAspect),
        label,
      ],
      description,
      summary: `${phaseEmoji} ${body1Symbol} ${majorAspectSymbol} ${body2Symbol} ${description}`,
    };
  }

  // 🌎 Public Methods

  /**
   * Resolves and builds a typed major-aspect event for two body longitudes.
   */
  buildMajorAspectEvent(args: {
    body1: Body;
    body2: Body;
    longitudeBody1: number;
    longitudeBody2: number;
    phase: AspectPhase;
    timestamp: Moment;
  }): Event {
    const { body1, body2, longitudeBody1, longitudeBody2, phase, timestamp } =
      args;
    const majorAspect = this.getMajorAspect({ longitudeBody1, longitudeBody2 });

    if (!majorAspect) {
      this.logger.error("📐 Missing major aspect", undefined, {
        at: timestamp.toISOString(),
        body1,
        body2,
        longitudeBody1,
        longitudeBody2,
      });
      throw new Error("No major aspect found");
    }

    return this.assembleMajorAspectEvent({
      body1,
      body2,
      majorAspect,
      phase,
      timestamp,
    });
  }

  /**
   * Returns the first in-orb major aspect for two longitudes.
   */
  getMajorAspect(args: {
    longitudeBody1: number;
    longitudeBody2: number;
  }): MajorAspect | null {
    const { longitudeBody1, longitudeBody2 } = args;

    for (const aspect of majorAspects) {
      if (
        this.aspectsUtilitiesService.isAspect({
          aspect,
          longitudeBody1,
          longitudeBody2,
        })
      ) {
        return aspect;
      }
    }

    return null;
  }
}
