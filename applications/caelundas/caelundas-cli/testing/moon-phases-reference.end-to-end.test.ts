import { NestFactory } from "@nestjs/core";
import moment from "moment-timezone";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { EphemerisService } from "../src/modules/ephemeris/ephemeris.service";
import { MonthlyLunarCycleService } from "../src/modules/monthly-lunar-cycle/monthly-lunar-cycle.service";

import { PIPELINE_TEST_TIMEOUT_MILLISECONDS } from "./pipeline-window.constants";
import { PipelineWindowModule } from "./pipeline-window.module";
import {
  assertReferenceEvents,
  loadReferenceFixture,
} from "./reference-fixtures.utilities";

import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
import type { ReferenceEvent } from "./reference-fixtures.types";
import type { INestApplicationContext } from "@nestjs/common";

/** Minutes either side of each published phase that the detector is run over. */
const SCAN_MINUTES = 30;

/** Extra ephemeris either side of the scan, for the detector's own neighbors. */
const EPHEMERIS_MARGIN_MINUTES = 35;

/**
 * Every primary Moon phase USNO publishes for 2026, checked against the real
 * Swiss Ephemeris detector. A whole-year pipeline sweep would take about an
 * hour, so only the Moon and Sun are computed, and only around each phase.
 * For the same reason the fixture is not in `fixtureNames`: its window is
 * there only because the schema requires one.
 */
describe("every 2026 primary Moon phase", () => {
  const fixture = loadReferenceFixture("usno-moon-phases-2026");
  let context: INestApplicationContext;

  beforeAll(async () => {
    context = await NestFactory.createApplicationContext(PipelineWindowModule, {
      abortOnError: false,
      logger: false,
    });
  });

  afterAll(async () => {
    await context.close();
  });

  /** Runs the detector minute by minute around one published phase. */
  function detectAround(reference: ReferenceEvent): DetectedCalendarEvent[] {
    const ephemerisService = context.get(EphemerisService);
    const monthlyLunarCycleService = context.get(MonthlyLunarCycleService);
    const published = moment.utc(reference.start);
    const margin = SCAN_MINUTES + EPHEMERIS_MARGIN_MINUTES;
    const range = {
      end: published.clone().add(margin, "minutes"),
      start: published.clone().subtract(margin, "minutes"),
      timezone: "UTC",
    };
    const coordinateEphemerisByBody =
      ephemerisService.getCoordinateEphemerisByBody({
        ...range,
        bodies: ["moon", "sun"],
      });

    return Array.from({ length: SCAN_MINUTES * 2 + 1 }, (_value, index) =>
      published.clone().add(index - SCAN_MINUTES, "minutes"),
    ).flatMap((minute) =>
      monthlyLunarCycleService.detect({
        minute,
        moonCoordinateEphemeris: coordinateEphemerisByBody.moon,
        sunCoordinateEphemeris: coordinateEphemerisByBody.sun,
      }),
    );
  }

  it(
    `agrees with ${fixture.source.name} within ${fixture.toleranceMinutes} minutes`,
    { timeout: PIPELINE_TEST_TIMEOUT_MILLISECONDS },
    () => {
      expect.hasAssertions();

      const events = fixture.events.flatMap((reference) =>
        detectAround(reference).filter(
          (event) => event.summary === reference.summary,
        ),
      );

      assertReferenceEvents(events, fixture);
    },
  );

  it("places the 26 October Full Moon on the 26th in New York", () => {
    expect.hasAssertions();

    const reference = fixture.events.find(
      (event) => event.start === "2026-10-26T04:12:00Z",
    );
    const fullMoon = reference
      ? detectAround(reference).find(
          (event) => event.summary === reference.summary,
        )
      : undefined;

    expect(
      fullMoon?.start.clone().tz("America/New_York").format("YYYY-MM-DD"),
    ).toBe("2026-10-26");
  });
});
