import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logger";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { aspectBodies as tripleAspectBodies } from "../caelundas/caelundas.constants";
import {
  symbolByBody,
  symbolByTripleAspect,
} from "../caelundas/symbol-caelundas.constants";

import type { AspectBodies } from "../aspects/aspects.types";
import type {
  Aspect,
  AspectPhase,
  Body,
  TripleAspect,
} from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { ProgressiveBodiesMeta } from "./triple-aspects.types";
import type { Moment } from "moment-timezone";

/**
 * Builds triple-aspect events and progressive spans for grand trines, T-squares, and yods.
 */
@Injectable()
export class TripleAspectsComposerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly aspectGraphService: AspectGraphService,
    private readonly aspectPhaseEmojiService: AspectPhaseEmojiService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(TripleAspectsComposerService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds progressive bodies meta.
   */
  private buildProgressiveBodiesMeta(
    forming: Event,
    aspectCapitalized: string,
  ): null | ProgressiveBodiesMeta {
    const tripleAspectBodyNames = new Set(
      tripleAspectBodies.map((body) => _.startCase(body)),
    );
    const bodiesCapitalized = _.sortBy(
      forming.categories.filter((category) =>
        tripleAspectBodyNames.has(category),
      ),
    );

    if (bodiesCapitalized.length !== 3) {
      return null;
    }

    const aspect = this.resolveAspectType(aspectCapitalized);
    if (!aspect) {
      this.logger.warn("📐 Skipping unknown aspect type", undefined, {
        aspectCapitalized,
      });
      return null;
    }

    return this.resolveProgressiveMeta(bodiesCapitalized, aspect);
  }

  /**
   * Builds triple aspect categories.
   */
  private buildTripleAspectCategories(args: {
    body1Capitalized: string;
    body2Capitalized: string;
    body3Capitalized: string;
    focalOrApexBody: Body | undefined;
    phase: AspectPhase;
    tripleAspect: TripleAspect;
  }): string[] {
    const {
      body1Capitalized,
      body2Capitalized,
      body3Capitalized,
      focalOrApexBody,
      phase,
      tripleAspect,
    } = args;

    const categories = [
      "Astronomy",
      "Astrology",
      "Compound Aspect",
      "Triple Aspect",
      _.startCase(tripleAspect),
      _.startCase(phase),
      body1Capitalized,
      body2Capitalized,
      body3Capitalized,
    ];

    if (focalOrApexBody) {
      categories.push(`${_.startCase(focalOrApexBody)} Focal`);
    }

    return categories;
  }

  /**
   * Builds triple aspect description.
   */
  private buildTripleAspectDescription(args: {
    bodiesSorted: (string | undefined)[];
    focalOrApexBody: Body | undefined;
    phase: AspectPhase;
    tripleAspect: TripleAspect;
  }): string {
    const { bodiesSorted, focalOrApexBody, phase, tripleAspect } = args;
    const base = `${bodiesSorted[0]}, ${bodiesSorted[1]}, ${bodiesSorted[2]} ${tripleAspect} ${phase}`;
    return focalOrApexBody
      ? `${base} (${_.startCase(focalOrApexBody)} focal)`
      : base;
  }

  /**
   * Derives focal extra info.
   */
  private getFocalExtraInfo(
    formingCategories: string[],
    aspect: TripleAspect,
  ): string {
    const focalCategory = formingCategories.find((category) =>
      category.includes(" Focal"),
    );
    if (!focalCategory) {
      return "";
    }

    const focalBody = focalCategory.replace(" Focal", "");
    if (aspect === "t-square") {
      return ` (focal: ${focalBody})`;
    }
    if (aspect === "yod") {
      return ` (apex: ${focalBody})`;
    }
    return "";
  }

  /**
   * Derives phase emoji.
   */
  private getPhaseEmoji(phase: AspectPhase): string {
    return this.aspectPhaseEmojiService.getPhaseEmoji(phase);
  }

  /**
   * Pairs progressive group pairs.
   */
  private pairProgressiveGroupPairs(
    formingEvents: Event[],
    dissolvingEvents: Event[],
  ): Event[] {
    const results: Event[] = [];

    for (
      let index = 0;
      index < Math.min(formingEvents.length, dissolvingEvents.length);
      index++
    ) {
      const forming = formingEvents[index];
      const dissolving = dissolvingEvents[index];

      if (
        !forming ||
        !dissolving ||
        dissolving.start.valueOf() <= forming.start.valueOf()
      ) {
        continue;
      }

      const aspectCapitalized = forming.categories.find((category) =>
        ["Grand Trine", "T Square", "Yod"].includes(category),
      );
      if (!aspectCapitalized) {
        continue;
      }

      const event = this.buildProgressiveEvent({
        aspectCapitalized,
        dissolving,
        forming,
      });
      if (event) {
        results.push(event);
      }
    }

    return results;
  }

  /**
   * Resolves aspect type.
   */
  private resolveAspectType(aspectCapitalized: string): null | TripleAspect {
    if (aspectCapitalized === "Grand Trine") {
      return "grand trine";
    }
    if (aspectCapitalized === "T Square") {
      return "t-square";
    }
    if (aspectCapitalized === "Yod") {
      return "yod";
    }
    return null;
  }

  /**
   * Resolves progressive meta.
   */
  private resolveProgressiveMeta(
    bodiesCapitalized: string[],
    aspect: TripleAspect,
  ): null | ProgressiveBodiesMeta {
    const body1Capitalized = bodiesCapitalized[0] ?? "";
    const body2Capitalized = bodiesCapitalized[1] ?? "";
    const body3Capitalized = bodiesCapitalized[2] ?? "";

    const bodyMap: Record<string, Body> = {
      Jupiter: "jupiter",
      Mars: "mars",
      Mercury: "mercury",
      Moon: "moon",
      Neptune: "neptune",
      Pluto: "pluto",
      Saturn: "saturn",
      Sun: "sun",
      Uranus: "uranus",
      Venus: "venus",
    };

    const body1 = bodyMap[body1Capitalized];
    const body2 = bodyMap[body2Capitalized];
    const body3 = bodyMap[body3Capitalized];

    if (!body1 || !body2 || !body3) {
      this.logger.warn(
        `🪐 Skipping progressive event with an unknown body`,
        undefined,
        {
          body1: body1Capitalized,
          body2: body2Capitalized,
          body3: body3Capitalized,
        },
      );
      return null;
    }

    return {
      aspect,
      body1,
      body1Capitalized,
      body2,
      body2Capitalized,
      body3,
      body3Capitalized,
    };
  }

  // 🌎 Public Methods

  /**
   * Builds one triple-aspect duration event from a forming/dissolving pair.
   */
  buildProgressiveEvent(args: {
    aspectCapitalized: string;
    dissolving: Event;
    forming: Event;
  }): Event | null {
    const meta = this.buildProgressiveBodiesMeta(
      args.forming,
      args.aspectCapitalized,
    );
    if (!meta) {
      return null;
    }

    const {
      aspect,
      body1,
      body1Capitalized,
      body2,
      body2Capitalized,
      body3,
      body3Capitalized,
    } = meta;
    const extraInfo = this.getFocalExtraInfo(args.forming.categories, aspect);
    const descBodies = `${body1Capitalized}, ${body2Capitalized}, ${body3Capitalized}`;

    return {
      categories: [
        "Astronomy",
        "Astrology",
        "Compound Aspect",
        "Triple Aspect",
        args.aspectCapitalized,
        body1Capitalized,
        body2Capitalized,
        body3Capitalized,
      ],
      description: `${descBodies} ${aspect}`,
      end: args.dissolving.start,
      start: args.forming.start,
      summary: `${symbolByTripleAspect[aspect]} ${symbolByBody[body1]}-${symbolByBody[body2]}-${symbolByBody[body3]} ${descBodies} ${aspect}${extraInfo}`,
    };
  }

  /**
   * Builds one triple-aspect boundary event with optional focal/apex metadata.
   */
  buildTripleAspectEvent(args: {
    body1: Body;
    body2: Body;
    body3: Body;
    focalOrApexBody?: Body;
    phase: AspectPhase;
    timestamp: Moment;
    tripleAspect: TripleAspect;
  }): Event {
    const {
      body1,
      body2,
      body3,
      focalOrApexBody,
      phase,
      timestamp,
      tripleAspect,
    } = args;

    const body1Capitalized = _.startCase(body1);
    const body2Capitalized = _.startCase(body2);
    const body3Capitalized = _.startCase(body3);
    const description = this.buildTripleAspectDescription({
      bodiesSorted: _.sortBy([
        body1Capitalized,
        body2Capitalized,
        body3Capitalized,
      ]),
      focalOrApexBody,
      phase,
      tripleAspect,
    });
    const summary = `${this.getPhaseEmoji(phase)}${symbolByTripleAspect[tripleAspect]} ${symbolByBody[body1]}-${symbolByBody[body2]}-${symbolByBody[body3]} ${description}`;

    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: timestamp.toISOString(),
      summary,
    });

    return {
      categories: this.buildTripleAspectCategories({
        body1Capitalized,
        body2Capitalized,
        body3Capitalized,
        focalOrApexBody,
        phase,
        tripleAspect,
      }),
      description,
      end: timestamp,
      start: timestamp,
      summary,
    };
  }

  /**
   * Returns neighbors of `body` connected by the requested aspect type.
   */
  findBodiesWithAspectTo(
    body: Body,
    aspectType: Aspect,
    edges: AspectBodies[],
  ): Body[] {
    return this.aspectGraphService.findBodiesWithAspectTo(
      body,
      aspectType,
      edges,
    );
  }

  /**
   * Builds a stable progressive grouping key from sorted bodies plus aspect label.
   */
  getProgressiveGroupKey(event: Event): string {
    const tripleAspectBodyNames = new Set(
      tripleAspectBodies.map((body) => _.startCase(body)),
    );
    const planets = _.sortBy(
      event.categories.filter((category) =>
        tripleAspectBodyNames.has(category),
      ),
    );
    const aspect = event.categories.find((category) =>
      ["Grand Trine", "T Square", "Yod"].includes(category),
    );

    if (planets.length === 3 && aspect) {
      return `${planets[0]}-${planets[1]}-${planets[2]}-${aspect}`;
    }
    return "";
  }

  /**
   * Returns `true` when an undirected body pair has the requested aspect in the edge set.
   */
  haveAspect(args: {
    aspectType: Aspect;
    body1: Body;
    body2: Body;
    edges: AspectBodies[];
  }): boolean {
    return this.aspectGraphService.haveAspect(args);
  }

  /**
   * Pairs sorted forming/dissolving events for one triple-aspect group key.
   */
  pairProgressiveGroup(groupEvents: Event[]): Event[] {
    const formingEvents = groupEvents
      .filter((event) => event.categories.includes("Forming"))
      .toSorted((left, right) => left.start.valueOf() - right.start.valueOf());
    const dissolvingEvents = groupEvents
      .filter((event) => event.categories.includes("Dissolving"))
      .toSorted((left, right) => left.start.valueOf() - right.start.valueOf());

    return this.pairProgressiveGroupPairs(formingEvents, dissolvingEvents);
  }
}
