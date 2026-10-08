import { NestFactory } from "@nestjs/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AspectsUtilitiesService } from "../src/modules/aspects/aspects-utilities.service";
import { aspectBodies } from "../src/modules/caelundas/caelundas.constants";
import { isAspect } from "../src/modules/caelundas/caelundas.types";
import { EphemerisService } from "../src/modules/ephemeris/ephemeris.service";

import { PIPELINE_TEST_TIMEOUT_MILLISECONDS } from "./pipeline-window.constants";
import { runPipelineWindow } from "./pipeline-window.functions";
import { PipelineWindowModule } from "./pipeline-window.module";

import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
import type { Aspect, Body } from "../src/modules/caelundas/caelundas.types";
import type { INestApplicationContext } from "@nestjs/common";

const philadelphia = { latitude: 39.949_309, longitude: -75.171_69 };

/** The windows of the two compound-aspect reference fixtures, so their sweeps are shared. */
const windows = [
  [
    "October 2026",
    { ...philadelphia, endDate: "2026-10-02", startDate: "2026-10-01" },
  ],
  [
    "January 2026",
    { ...philadelphia, endDate: "2026-01-17", startDate: "2026-01-15" },
  ],
] as const;

/** The two bodies and the aspect a simple-aspect event names in its categories. */
function parseSimpleAspect(
  event: DetectedCalendarEvent,
): null | { aspect: Aspect; body1: Body; body2: Body } {
  const categories = event.categories.map((category) => category.toLowerCase());
  const [body1, body2, ...others] = aspectBodies.filter((body) =>
    categories.includes(body),
  );
  const aspect = categories.find((category) => isAspect(category));
  if (!aspect || !body1 || !body2 || others.length > 0) return null;
  return { aspect, body1, body2 };
}

/**
 * Seeding must not invent simple aspects: any simple aspect forming at a
 * window's first minute has to be one that was out of orb the minute before,
 * judged from the real ephemeris rather than from caelundas' own events.
 */
describe(
  "simple aspects at the window start",
  { timeout: PIPELINE_TEST_TIMEOUT_MILLISECONDS },
  () => {
    let context: INestApplicationContext;

    beforeAll(async () => {
      context = await NestFactory.createApplicationContext(
        PipelineWindowModule,
        { abortOnError: false, logger: false },
      );
    });

    afterAll(async () => {
      await context.close();
    });

    it.each(windows)(
      "forms at the first minute of %s only pairs that were out of orb a minute earlier",
      async (_name, window) => {
        expect.hasAssertions();

        const { input, perfective } = await runPipelineWindow(window);
        const firstMinute = input.start.clone().startOf("day");
        const previousMinute = firstMinute.clone().subtract(1, "minute");
        const coordinateEphemerisByBody = context
          .get(EphemerisService)
          .getCoordinateEphemerisByBody({
            bodies: [...aspectBodies],
            end: firstMinute,
            start: previousMinute,
            timezone: input.timezone,
          });
        const aspectsUtilitiesService = context.get(AspectsUtilitiesService);
        const longitudeBefore = (body: Body): number =>
          coordinateEphemerisByBody[body][previousMinute.toISOString()]
            ?.longitude ?? Number.NaN;

        const inOrbBefore = perfective
          .filter(
            (event) =>
              event.start.isSame(firstMinute) &&
              ["Simple Aspect", "Forming"].every((category) =>
                event.categories.includes(category),
              ),
          )
          .filter((event) => {
            const parsed = parseSimpleAspect(event);
            return (
              parsed === null ||
              aspectsUtilitiesService.isAspect({
                aspect: parsed.aspect,
                longitudeBody1: longitudeBefore(parsed.body1),
                longitudeBody2: longitudeBefore(parsed.body2),
              })
            );
          });

        expect(inOrbBefore.map((event) => event.summary)).toStrictEqual([]);
      },
    );
  },
);
