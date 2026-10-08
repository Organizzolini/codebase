import fs from "node:fs";
import path from "node:path";

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import moment from "moment-timezone";
import { vi } from "vitest";

import { LoggerModule } from "@codebase/logging";

import { environmentSchema } from "../src/constants";
import { CaelundasCommand } from "../src/modules/caelundas/caelundas.command";
import { CalendarEventsModule } from "../src/modules/calendar-events/calendar-events.module";
import { CalendarModule } from "../src/modules/calendar/calendar.module";
import { InputModule } from "../src/modules/input/input.module";
import { PerfectiveService } from "../src/modules/perfective/perfective.service";
import { ProgressiveService } from "../src/modules/progressive/progressive.service";

import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
import type { Input } from "../src/modules/input/input.types";
import type {
  CalendarCommandOutput,
  CalendarCommandRun,
} from "./calendar-command.types";

/** An event the stand-in detector knows about, with its times in UTC. */
export function detectable(
  summary: string,
  start: string,
  end = start,
): DetectedCalendarEvent {
  return {
    categories: ["aspects", "e2e"],
    description: `${summary} description`,
    end: moment.utc(end),
    start: moment.utc(start),
    summary,
  };
}

/**
 * Runs the real `CaelundasCommand` once, against the Postgres the caller
 * has already pointed the `CAELUNDAS_POSTGRES_*` variables at, and reads
 * back the ICS and JSON files it wrote.
 *
 * Only the two detectors are replaced, because Swiss Ephemeris detection is
 * minutes of computation; like a real detector, the stand-in reports the
 * events that start from the start date through the whole of the end date.
 * Each run boots its own application context, because `ConfigModule`
 * reads the run's variables once, when it is compiled.
 */
export async function runCalendarCommand(
  run: CalendarCommandRun,
  detectableEvents: readonly DetectedCalendarEvent[],
): Promise<CalendarCommandOutput> {
  vi.stubEnv("START_DATE", run.startDate);
  vi.stubEnv("END_DATE", run.endDate);
  vi.stubEnv("LATITUDE", String(run.latitude));
  vi.stubEnv("LONGITUDE", String(run.longitude));
  vi.stubEnv("OUTPUT_DIRECTORY", run.outputDirectory);
  fs.mkdirSync(run.outputDirectory, { recursive: true });

  /** The run's application: the real command, with stand-in detectors. */
  @Module({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        isGlobal: true,
        validate: (config: Record<string, unknown>) =>
          environmentSchema.parse(config),
      }),
      LoggerModule,
      CalendarModule,
      CalendarEventsModule,
      InputModule,
    ],
    providers: [
      CaelundasCommand,
      {
        provide: PerfectiveService,
        useValue: {
          detect: (input: Input): DetectedCalendarEvent[] =>
            detectableEvents.filter(
              (event) =>
                event.start.isSameOrAfter(input.start) &&
                event.start.isBefore(input.end.clone().add(1, "day")),
            ),
        },
      },
      {
        provide: ProgressiveService,
        useValue: { detect: (): DetectedCalendarEvent[] => [] },
      },
    ],
  })
  class CalendarCommandRunModule {}

  const context = await NestFactory.createApplicationContext(
    CalendarCommandRunModule,
    { logger: false },
  );

  try {
    await context.get(CaelundasCommand).run();
  } finally {
    await context.close();
  }

  return readCalendarOutput(run.outputDirectory);
}

/** Reads the ICS and JSON files a run wrote into `outputDirectory`. */
function readCalendarOutput(outputDirectory: string): CalendarCommandOutput {
  const files = fs.readdirSync(outputDirectory);
  const read = (extension: string): string =>
    fs.readFileSync(
      path.join(
        outputDirectory,
        files.find((file) => file.endsWith(extension)) ?? "",
      ),
      "utf8",
    );

  return {
    ics: read(".ics"),
    json: JSON.parse(read(".json")) as { summary: string }[],
  };
}
