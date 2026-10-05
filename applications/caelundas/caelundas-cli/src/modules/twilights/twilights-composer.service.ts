import { Injectable } from "@nestjs/common";

import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { TwilightsBuilderService } from "./twilights-builder.service";

import type { Event } from "../calendar/calendar.types";

/**
 * Composes progressive twilight/daylight intervals by pairing ordered transition events.
 */
@Injectable()
export class TwilightsComposerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly twilightsBuilderService: TwilightsBuilderService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Builds morning twilight intervals from astronomical to nautical and nautical to civil.
   */
  buildDawnProgressiveEvents(
    astronomicalDawnEvents: Event[],
    nauticalDawnEvents: Event[],
    civilDawnEvents: Event[],
  ): Event[] {
    return [
      ...this.pairAndBuild({
        beginnings: astronomicalDawnEvents,
        builder: (beginning, ending) =>
          this.twilightsBuilderService.getAstronomicalTwilightMorningDurationEvent(
            beginning,
            ending,
          ),
        endings: nauticalDawnEvents,
        label: "Astronomical Twilight (Morning)",
      }),
      ...this.pairAndBuild({
        beginnings: nauticalDawnEvents,
        builder: (beginning, ending) =>
          this.twilightsBuilderService.getNauticalTwilightMorningDurationEvent(
            beginning,
            ending,
          ),
        endings: civilDawnEvents,
        label: "Nautical Twilight (Morning)",
      }),
    ];
  }

  /**
   * Builds daytime/evening intervals: daylight, nautical twilight, astronomical twilight.
   */
  buildDuskProgressiveEvents(args: {
    astronomicalDuskEvents: Event[];
    civilDawnEvents: Event[];
    civilDuskEvents: Event[];
    nauticalDuskEvents: Event[];
  }): Event[] {
    const {
      astronomicalDuskEvents,
      civilDawnEvents,
      civilDuskEvents,
      nauticalDuskEvents,
    } = args;

    return [
      ...this.pairAndBuild({
        beginnings: civilDawnEvents,
        builder: (beginning, ending) =>
          this.twilightsBuilderService.getDaylightDurationEvent(
            beginning,
            ending,
          ),
        endings: civilDuskEvents,
        label: "Daylight",
      }),
      ...this.pairAndBuild({
        beginnings: civilDuskEvents,
        builder: (beginning, ending) =>
          this.twilightsBuilderService.getNauticalTwilightEveningDurationEvent(
            beginning,
            ending,
          ),
        endings: nauticalDuskEvents,
        label: "Nautical Twilight (Evening)",
      }),
      ...this.pairAndBuild({
        beginnings: nauticalDuskEvents,
        builder: (beginning, ending) =>
          this.twilightsBuilderService.getAstronomicalTwilightEveningDurationEvent(
            beginning,
            ending,
          ),
        endings: astronomicalDuskEvents,
        label: "Astronomical Twilight (Evening)",
      }),
    ];
  }

  /**
   * Pairs beginnings/endings via progressive utilities and maps each pair through `builder`.
   */
  pairAndBuild(args: {
    beginnings: Event[];
    builder: (beginning: Event, ending: Event) => Event;
    endings: Event[];
    label: string;
  }): Event[] {
    const { beginnings, builder, endings, label } = args;
    const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
      beginnings,
      endings,
      label,
    );

    return pairs.map(([beginning, ending]) => builder(beginning, ending));
  }
}
