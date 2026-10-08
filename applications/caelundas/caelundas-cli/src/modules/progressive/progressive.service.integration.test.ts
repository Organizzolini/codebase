import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { MajorAspectEventService } from "../major-aspects/major-aspect-event.service";
import { RetrogradesService } from "../retrogrades/retrogrades.service";
import { TwilightsService } from "../twilights/twilights.service";

import { ProgressiveModule } from "./progressive.module";
import { ProgressiveService } from "./progressive.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";

/**
 * Progressive-step tests: the real progressive pass, fed hand-built perfective
 * events and no ephemeris, for windows that open in the middle of an
 * occurrence. Each one used to shift every later span by one occurrence.
 */
describe("progressiveService span pairing", () => {
  let progressiveService: ProgressiveService;
  let majorAspectEventService: MajorAspectEventService;
  let retrogradesService: RetrogradesService;
  let twilightsService: TwilightsService;

  const at = (iso: string): moment.Moment => moment.utc(iso);
  const spans = (
    events: DetectedCalendarEvent[],
    summary: string,
  ): { end: string; start: string }[] =>
    events
      .filter((event) => event.summary === summary)
      .map((event) => ({
        end: event.end.toISOString(),
        start: event.start.toISOString(),
      }))
      .toSorted((first, second) => first.start.localeCompare(second.start));

  const expectNoInvertedSpans = (events: DetectedCalendarEvent[]): void => {
    const inverted = events.filter((event) => event.end.isBefore(event.start));

    expect(inverted.map((event) => event.summary)).toStrictEqual([]);
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true }),
        LoggerModule,
        ProgressiveModule,
      ],
    }).compile();

    progressiveService = module.get(ProgressiveService);
    majorAspectEventService = module.get(MajorAspectEventService, {
      strict: false,
    });
    retrogradesService = module.get(RetrogradesService, { strict: false });
    twilightsService = await module.resolve(TwilightsService, undefined, {
      strict: false,
    });
  });

  it("runs each night from tonight's astronomical dusk to tomorrow's dawn", () => {
    const perfective = [
      twilightsService.buildAstronomicalDawnEvent(at("2026-03-19T09:35:00Z")),
      twilightsService.buildAstronomicalDuskEvent(at("2026-03-20T00:43:00Z")),
      twilightsService.buildAstronomicalDawnEvent(at("2026-03-20T09:33:00Z")),
      twilightsService.buildAstronomicalDuskEvent(at("2026-03-21T00:44:00Z")),
      twilightsService.buildAstronomicalDawnEvent(at("2026-03-21T09:32:00Z")),
      twilightsService.buildAstronomicalDuskEvent(at("2026-03-22T00:45:00Z")),
    ];

    const progressive = progressiveService.detect(perfective);

    expect(spans(progressive, "🌃 Night")).toStrictEqual([
      { end: "2026-03-20T09:33:00.000Z", start: "2026-03-20T00:43:00.000Z" },
      { end: "2026-03-21T09:32:00.000Z", start: "2026-03-21T00:44:00.000Z" },
    ]);

    expectNoInvertedSpans(progressive);
  });

  it("keeps evening astronomical twilight forward when it ends after local midnight", () => {
    const perfective = [
      twilightsService.buildAstronomicalDuskEvent(at("2026-06-19T22:28:00Z")),
      twilightsService.buildNauticalDuskEvent(at("2026-06-20T21:34:00Z")),
      twilightsService.buildAstronomicalDuskEvent(at("2026-06-20T22:29:00Z")),
      twilightsService.buildNauticalDuskEvent(at("2026-06-21T21:34:00Z")),
    ];

    const progressive = progressiveService.detect(perfective);

    expect(
      spans(progressive, "🌌 Astronomical Twilight (Evening)"),
    ).toStrictEqual([
      { end: "2026-06-20T22:29:00.000Z", start: "2026-06-20T21:34:00.000Z" },
    ]);

    expectNoInvertedSpans(progressive);
  });

  it("emits no retrograde span for a window between two Mercury retrogrades", () => {
    // Station times are illustrative: only their order matters to pairing.
    const station = (
      direction: "direct" | "retrograde",
      iso: string,
    ): DetectedCalendarEvent =>
      retrogradesService.buildRetrogradeEvent({
        body: "mercury",
        direction,
        timestamp: at(iso),
      });
    const between = progressiveService.detect([
      station("direct", "2026-07-23T21:00:00Z"),
      station("retrograde", "2026-10-24T07:00:00Z"),
    ]);
    const control = progressiveService.detect([
      station("retrograde", "2026-06-29T17:00:00Z"),
      station("direct", "2026-07-23T21:00:00Z"),
    ]);

    expect(spans(between, "☿ ↩️ Mercury Retrograde")).toStrictEqual([]);
    expect(spans(control, "☿ ↩️ Mercury Retrograde")).toStrictEqual([
      { end: "2026-07-23T21:00:00.000Z", start: "2026-06-29T17:00:00.000Z" },
    ]);

    expectNoInvertedSpans(between);
    expectNoInvertedSpans(control);
  });

  it("pairs every later occurrence of an aspect when the window opens inside its orb", () => {
    const aspectEvent = (
      phase: "dissolving" | "forming",
      iso: string,
    ): DetectedCalendarEvent =>
      majorAspectEventService.buildMajorAspectEvent({
        body1: "sun",
        body2: "mars",
        longitudeBody1: 0,
        longitudeBody2: 92,
        phase,
        timestamp: at(iso),
      });
    const perfective = [
      aspectEvent("dissolving", "2026-01-02T00:00:00Z"),
      aspectEvent("forming", "2026-03-01T00:00:00Z"),
      aspectEvent("dissolving", "2026-03-20T00:00:00Z"),
      aspectEvent("forming", "2026-06-01T00:00:00Z"),
      aspectEvent("dissolving", "2026-06-25T00:00:00Z"),
    ];

    const progressive = progressiveService.detect(perfective);
    const aspectSpans = progressive
      .filter((event) => event.categories.includes("Major Aspect"))
      .map((event) => ({
        end: event.end.toISOString(),
        start: event.start.toISOString(),
      }));

    expect(aspectSpans).toStrictEqual([
      { end: "2026-03-20T00:00:00.000Z", start: "2026-03-01T00:00:00.000Z" },
      { end: "2026-06-25T00:00:00.000Z", start: "2026-06-01T00:00:00.000Z" },
    ]);

    expectNoInvertedSpans(progressive);
  });
});
